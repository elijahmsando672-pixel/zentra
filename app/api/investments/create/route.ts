import { prisma } from "@/lib/server/prisma";
import { ok, fail, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import { mapInvestment } from "@/lib/server/mappers";
import { isUniqueConstraintError, operationReference, readIdempotencyKey } from "@/lib/server/idempotency";
import { parsePositiveMoney } from "@/lib/server/money";

const DAY = 86_400_000;
const round2 = (n: number) => Number(n.toFixed(2));

export async function POST(req: Request) {
  let replayReference: string | null = null;
  let replayUserId: string | null = null;
  let replayInput: { productId: string; amount: number } | null = null;
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const idempotencyKey = readIdempotencyKey(req);
    if (!idempotencyKey) return fail("A valid Idempotency-Key header is required.", "idempotency_key_required");
    const body = await req.json();
    const productId = String(body.productId ?? "");
    const parsedAmount = parsePositiveMoney(body.amount);
    if (!parsedAmount) return fail("Enter a valid amount with no more than two decimal places.", "invalid_amount");
    const amount = parsedAmount.value;
    const reference = operationReference("INV", user.id, idempotencyKey);
    replayReference = reference;
    replayUserId = user.id;
    replayInput = { productId, amount };
    const previous = await prisma.investment.findUnique({ where: { reference }, include: { product: true } });
    if (previous) {
      const matchingTransaction = await prisma.transaction.findUnique({ where: { reference } });
      if (!matchingTransaction || Number(previous.amount) !== amount || previous.productId !== productId) {
        return fail("This request key was already used for a different investment.", "idempotency_conflict", undefined, 409);
      }
      return ok({ investment: mapInvestment(previous), reference });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return fail("Product not found.", "not_found");
    if (product.status !== "active") {
      return fail("This plan is not currently open for new commitments.", "unavailable");
    }
    if (amount < Number(product.minEntry)) {
      return fail(`The minimum entry is KES ${Number(product.minEntry).toLocaleString()}.`, "below_min", {
        amount: `Minimum KES ${Number(product.minEntry).toLocaleString()}.`,
      });
    }
    if (amount > Number(product.maxEntry)) {
      return fail(`The maximum entry is KES ${Number(product.maxEntry).toLocaleString()}.`, "above_max", {
        amount: `Maximum KES ${Number(product.maxEntry).toLocaleString()}.`,
      });
    }

    if (Number(product.capacityUsed) >= Number(product.capacityTotal)) {
      return fail("This plan has reached full capacity for the current cohort.", "sold_out");
    }

    const dailyRate = Number(product.dailyRate);
    const dailyEarning = round2((amount * dailyRate) / 100);
    const projectedEarnings = round2(dailyEarning * product.durationDays);
    const now = new Date();
    const maturity = new Date(now.getTime() + product.durationDays * DAY);

    const investment = await prisma.$transaction(async (tx) => {
      const debited = await tx.wallet.updateMany({
        where: { userId: user.id, wallet: "deposit", locked: false, balance: { gte: amount } },
        data: { balance: { decrement: amount } },
      });
      if (debited.count === 0) throw new Error("INSUFFICIENT_BALANCE");
      const capacity = await tx.product.updateMany({
        where: { id: product.id, status: "active", capacityUsed: { lte: Number(product.capacityTotal) - amount } },
        data: { capacityUsed: { increment: amount } },
      });
      if (capacity.count === 0) throw new Error("SOLD_OUT");
      await tx.wallet.update({
        where: { userId_wallet: { userId: user.id, wallet: "investment" } },
        data: { balance: { increment: amount } },
      });
      const createdInvestment = await tx.investment.create({
        data: {
        reference,
        userId: user.id,
        productId: product.id,
        amount,
        dailyEarning,
        projectedEarnings,
        projectedPayout: round2(amount + projectedEarnings),
        earnedToDate: 0,
        startDate: now,
        maturityDate: maturity,
        status: "active",
        wallet: "investment",
        earnings: {
          create: Array.from({ length: product.durationDays }, (_, i) => ({
            day: i + 1,
            date: new Date(now.getTime() + i * DAY),
            amount: dailyEarning,
            status: "scheduled" as const,
          })),
        },
        },
        include: { product: true },
      });

      const events = [
        { id: `${createdInvestment.id}_ev1`, label: "Commitment created", description: `${amount.toLocaleString()} KES committed to ${product.name}.`, timestamp: now.toISOString(), status: "done" },
        { id: `${createdInvestment.id}_ev2`, label: "Capital debited", description: "Funds moved from your Deposit Wallet.", timestamp: now.toISOString(), status: "done" },
      ];

      await tx.transaction.create({
        data: {
          reference,
          userId: user.id,
          type: "investment",
          status: "successful",
          direction: "outgoing",
          amount,
          fee: 0,
          netAmount: amount,
          wallet: "investment",
          description: `Investment in ${product.name}`,
          counterparty: product.name,
          productId: product.id,
          createdAt: now,
          events,
        },
      });
      return createdInvestment;
    });

    return ok({ investment: mapInvestment(investment), reference });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE") {
      return fail("Your Deposit Wallet does not have enough balance for this commitment.", "insufficient_balance", {
        amount: "Insufficient Deposit Wallet balance. Add funds first.",
      });
    }
    if (error instanceof Error && error.message === "SOLD_OUT") return fail("This plan has reached full capacity for the current cohort.", "sold_out");
    if (isUniqueConstraintError(error) && replayReference && replayUserId && replayInput) {
      const previous = await prisma.investment.findUnique({ where: { reference: replayReference }, include: { product: true } });
      const transaction = await prisma.transaction.findUnique({ where: { reference: replayReference } });
      if (previous && transaction && previous.userId === replayUserId && previous.productId === replayInput.productId && Number(previous.amount) === replayInput.amount) {
        return ok({ investment: mapInvestment(previous), reference: replayReference });
      }
      return fail("This request key was already used for a different investment.", "idempotency_conflict", undefined, 409);
    }
    return serverError(error);
  }
}

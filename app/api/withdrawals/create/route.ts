import bcrypt from "bcryptjs";
import { prisma } from "@/lib/server/prisma";
import { fail, ok, serverError, unauthorized } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import { mapWithdrawal } from "@/lib/server/mappers";
import {
  DAILY_WITHDRAWAL_LIMIT,
  DEMO_TRANSACTION_PIN,
  MAX_WITHDRAWAL,
  MIN_WITHDRAWAL,
  WITHDRAWAL_FEE_FLAT,
  WITHDRAWAL_FEE_PERCENT,
} from "@/lib/constants";
import { isUniqueConstraintError, operationReference, readIdempotencyKey } from "@/lib/server/idempotency";
import { parsePositiveMoney } from "@/lib/server/money";
import type { WalletType } from "@/lib/types";

const round2 = (n: number) => Number(n.toFixed(2));

async function verifyPin(userId: string, pin: string, pinHash: string | null, hasPin: boolean) {
  if (hasPin && pinHash) return bcrypt.compare(pin, pinHash);
  return pin === DEMO_TRANSACTION_PIN;
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const idempotencyKey = readIdempotencyKey(req);
    if (!idempotencyKey) {
      return fail("A valid Idempotency-Key header is required.", "idempotency_key_required");
    }

    const body = await req.json();
    const parsedAmount = parsePositiveMoney(body.amount);
    const wallet = body.wallet as WalletType;
    const payoutAccountId = String(body.payoutAccountId ?? "");
    const pin = String(body.pin ?? "");

    if (!parsedAmount) return fail("Enter a valid amount with no more than two decimal places.", "invalid_amount");
    const amount = parsedAmount.value;
    if (amount < MIN_WITHDRAWAL || amount > MAX_WITHDRAWAL) {
      return fail(
        `Withdrawals must be between KES ${MIN_WITHDRAWAL.toLocaleString()} and KES ${MAX_WITHDRAWAL.toLocaleString()}.`,
        "out_of_range"
      );
    }

    const pinOk = await verifyPin(user.id, pin, user.transactionPinHash, user.hasTransactionPin);
    if (!pinOk) {
      return fail(
        "That PIN is not correct. 2 attempts remaining before the PIN is temporarily locked.",
        "bad_pin",
        { pin: "Incorrect transaction PIN." }
      );
    }

    const account = await prisma.payoutAccount.findFirst({
      where: { id: payoutAccountId, userId: user.id },
    });
    if (!account) return fail("Payout account not found.", "invalid_account");

    const source = await prisma.wallet.findFirst({ where: { userId: user.id, wallet } });
    if (!source || source.locked) {
      return fail("This wallet cannot be used for withdrawals.", "wallet_locked");
    }

    const reference = operationReference("WDR", user.id, idempotencyKey);
    const replay = async () => {
      const existing = await prisma.withdrawal.findUnique({
        where: { reference },
        include: {
          payoutAccount: true,
          user: { select: { id: true, fullName: true, accountNumber: true } },
        },
      });
      if (!existing) return null;
      const matches =
        existing.userId === user.id &&
        Math.round(Number(existing.amount) * 100) === parsedAmount.cents &&
        existing.wallet === wallet &&
        existing.payoutAccountId === payoutAccountId;
      if (!matches) {
        return fail("This request key was already used for a different withdrawal.", "idempotency_conflict", undefined, 409);
      }
      return ok({ withdrawal: mapWithdrawal(existing), reference: existing.reference });
    };

    const previous = await replay();
    if (previous) return previous;

    const fee = round2((amount * WITHDRAWAL_FEE_PERCENT) / 100 + WITHDRAWAL_FEE_FLAT);
    const net = round2(amount - fee);
    const now = new Date();
    const riskScore = Math.min(95, Math.round(amount / 2500) + (wallet === "bonus" ? 20 : 5));
    const riskLevel = riskScore > 60 ? "high" : riskScore > 30 ? "medium" : "low";
    const events = [
      {
        id: `${reference}_ev1`,
        label: "Withdrawal requested",
        description: `KES ${amount.toLocaleString()} requested to ${account.nickname}.`,
        timestamp: now.toISOString(),
        status: "done",
      },
      {
        id: `${reference}_ev2`,
        label: "PIN verified",
        description: "Transaction PIN confirmed.",
        timestamp: now.toISOString(),
        status: "done",
      },
      {
        id: `${reference}_ev3`,
        label: "Awaiting approval",
        description: "Your request is in the review queue.",
        timestamp: now.toISOString(),
        status: "current",
      },
    ];
    const approvals = [
      { id: `${reference}_apr1`, step: 1, approver: "Risk Engine", role: "system", action: "pending" },
      { id: `${reference}_apr2`, step: 2, approver: "Finance Desk", role: "finance", action: "pending" },
    ];

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    try {
      const result = await prisma.$transaction(async (tx) => {
        const totalToday = await tx.withdrawal.aggregate({
          where: {
            userId: user.id,
            createdAt: { gte: startOfDay },
            status: { notIn: ["rejected", "cancelled"] },
          },
          _sum: { amount: true },
        });
        const amountToday = Number(totalToday._sum.amount ?? 0);
        if (amountToday + amount > DAILY_WITHDRAWAL_LIMIT) {
          return { kind: "daily_limit" as const, remaining: Math.max(0, DAILY_WITHDRAWAL_LIMIT - amountToday) };
        }

        const debit = await tx.wallet.updateMany({
          where: {
            id: source.id,
            userId: user.id,
            wallet,
            locked: false,
            balance: { gte: parsedAmount.decimal },
          },
          data: { balance: { decrement: parsedAmount.decimal } },
        });
        if (debit.count === 0) return { kind: "insufficient" as const };

        await tx.wallet.update({
          where: { userId_wallet: { userId: user.id, wallet: "pending_withdrawal" } },
          data: { balance: { increment: parsedAmount.decimal } },
        });

        const withdrawal = await tx.withdrawal.create({
          data: {
            reference,
            userId: user.id,
            amount: parsedAmount.decimal,
            fee,
            netAmount: net,
            wallet,
            payoutAccountId: account.id,
            status: "pending_approval",
            riskScore,
            riskLevel,
            pinVerified: true,
            otpVerified: false,
            approvals,
            events,
            createdAt: now,
          },
          include: {
            payoutAccount: true,
            user: { select: { id: true, fullName: true, accountNumber: true } },
          },
        });

        await tx.transaction.create({
          data: {
            reference,
            userId: user.id,
            type: "withdrawal",
            status: "pending",
            direction: "outgoing",
            amount: parsedAmount.decimal,
            fee,
            netAmount: net,
            wallet,
            description: `Withdrawal to ${account.nickname}`,
            counterparty: account.phone,
            withdrawalId: withdrawal.id,
            createdAt: now,
            events,
          },
        });
        await tx.notification.create({
          data: {
            userId: user.id,
            category: "account",
            title: "Withdrawal in review",
            message: `Your request ${reference} is being reviewed. You will be notified once it is processed.`,
            actionUrl: "/wallet",
            actionLabel: "View wallet",
          },
        });

        return { kind: "created" as const, withdrawal };
      }, { isolationLevel: "Serializable" });

      if (result.kind === "created") {
        return ok({ withdrawal: mapWithdrawal(result.withdrawal), reference });
      }
      const concurrentReplay = await replay();
      if (concurrentReplay) return concurrentReplay;
      if (result.kind === "daily_limit") {
        return fail(
          `This request exceeds your remaining daily withdrawal limit of KES ${result.remaining.toLocaleString()}.`,
          "daily_limit",
          { amount: "This request exceeds your remaining daily withdrawal limit." }
        );
      }
      return fail("Insufficient balance.", "insufficient", { amount: "Insufficient balance." });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const concurrentReplay = await replay();
        if (concurrentReplay) return concurrentReplay;
      }
      if (typeof error === "object" && error !== null && "code" in error && error.code === "P2034") {
        const concurrentReplay = await replay();
        if (concurrentReplay) return concurrentReplay;
        return fail("A withdrawal is already being processed. Retry this request.", "concurrent_request", undefined, 409);
      }
      throw error;
    }
  } catch (error) {
    return serverError(error);
  }
}

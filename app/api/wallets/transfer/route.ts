import { prisma } from "@/lib/server/prisma";
import { fail, ok, serverError, unauthorized } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import { isUniqueConstraintError, operationReference, readIdempotencyKey } from "@/lib/server/idempotency";
import { parsePositiveMoney } from "@/lib/server/money";
import { postJournal, toCents, transferEntries } from "@/lib/server/ledger";
import { WALLET_META } from "@/lib/constants";
import type { WalletType } from "@/lib/types";

function matchingTransfer(
  record: { userId: string; type: string; amount: unknown; wallet: string; description: string },
  input: { userId: string; from: WalletType; to: WalletType; amount: number; description: string }
) {
  return (
    record.userId === input.userId &&
    record.type === "transfer" &&
    Math.round(Number(record.amount) * 100) === Math.round(input.amount * 100) &&
    record.wallet === input.from &&
    record.description === input.description
  );
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
    const from = body.from as WalletType;
    const to = body.to as WalletType;
    const parsedAmount = parsePositiveMoney(body.amount);

    if (from === to) return fail("Choose two different wallets.", "same_wallet");
    if (!WALLET_META[from] || !WALLET_META[to]) return fail("Wallet not found.", "not_found");
    if (!parsedAmount) return fail("Enter a valid amount with no more than two decimal places.", "invalid_amount");

    const reference = operationReference("TRF", user.id, idempotencyKey);
    const description = `Internal transfer · ${WALLET_META[from].shortLabel} → ${WALLET_META[to].shortLabel}`;
    const replay = async () => {
      const existing = await prisma.transaction.findUnique({ where: { reference } });
      if (!existing) return null;
      if (!matchingTransfer(existing, { userId: user.id, from, to, amount: parsedAmount.value, description })) {
        return fail("This request key was already used for a different transfer.", "idempotency_conflict", undefined, 409);
      }
      return ok({ done: true as const, reference: existing.reference });
    };

    const previous = await replay();
    if (previous) return previous;

    const rows = await prisma.wallet.findMany({
      where: { userId: user.id, wallet: { in: [from, to] } },
    });
    const source = rows.find((row) => row.wallet === from);
    const target = rows.find((row) => row.wallet === to);
    if (!source || !target) return fail("Wallet not found.", "not_found");
    if (source.locked) {
      return fail(`${WALLET_META[from].label} funds are not available for transfer.`, "locked");
    }

    const now = new Date();
    try {
      const result = await prisma.$transaction(async (tx) => {
        const debit = await tx.wallet.updateMany({
          where: {
            id: source.id,
            userId: user.id,
            wallet: from,
            locked: false,
            balance: { gte: parsedAmount.decimal },
          },
          data: { balance: { decrement: parsedAmount.decimal } },
        });
        if (debit.count === 0) {
          const current = await tx.wallet.findUnique({ where: { id: source.id }, select: { locked: true } });
          return { kind: current?.locked ? "locked" as const : "insufficient" as const };
        }

        await tx.wallet.update({
          where: { id: target.id },
          data: { balance: { increment: parsedAmount.decimal } },
        });
        await tx.transaction.create({
          data: {
            reference,
            userId: user.id,
            type: "transfer",
            status: "successful",
            direction: "outgoing",
            amount: parsedAmount.decimal,
            fee: 0,
            netAmount: parsedAmount.decimal,
            wallet: from,
            description,
            createdAt: now,
            events: [
              {
                id: `${reference}_event`,
                label: "Transfer completed",
                description: `${parsedAmount.value.toLocaleString()} KES moved between wallets.`,
                timestamp: now.toISOString(),
                status: "done",
              },
            ],
          },
        });
        await postJournal(tx, {
          type: "transfer",
          description,
          actor: `user:${user.id}`,
          userAccountNumber: user.accountNumber,
          reference,
          entries: transferEntries(user.accountNumber, from, to, parsedAmount.cents),
        });
        return { kind: "done" as const };
      });

      if (result.kind === "done") return ok({ done: true as const, reference });
      const concurrentReplay = await replay();
      if (concurrentReplay) return concurrentReplay;
      return result.kind === "locked"
        ? fail(`${WALLET_META[from].label} funds are not available for transfer.`, "locked")
        : fail("Insufficient balance in the source wallet.", "insufficient");
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const concurrentReplay = await replay();
        if (concurrentReplay) return concurrentReplay;
      }
      throw error;
    }
  } catch (error) {
    return serverError(error);
  }
}

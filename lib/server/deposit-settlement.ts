import { Prisma, type Role } from "@prisma/client";
import { prisma } from "@/lib/server/prisma";
import { depositEntries, postJournal, toCents } from "@/lib/server/ledger";

type Event = {
  id: string;
  label: string;
  description: string;
  timestamp: string;
  status: "done" | "current" | "upcoming";
};

const OPEN_STATUSES = ["pending", "initiated"] as const;

const mask = (phone: string) => phone.replace(/(\d{4})\d{3}(\d{3})/, "$1***$2");

export type SettleDepositInput = {
  depositId: string;
  provider: "mpesa" | "paypal";
  actor: string;
  label: string;
  description: string;
  providerReference?: string | null;
  audit?: { actor: string; actorRole: Role; reason: string; ip: string };
};

/**
 * Idempotently settle a pending deposit from an authoritative server-side
 * confirmation. The status guard, the unique transaction/journal references
 * and the shared database transaction guarantee a deposit is credited once.
 */
export async function settleDeposit(input: SettleDepositInput) {
  const deposit = await prisma.deposit.findUnique({
    where: { id: input.depositId },
    include: { user: { select: { accountNumber: true } } },
  });
  if (!deposit) return { settled: false as const, deposit: null };

  const amount = Number(deposit.amount);
  const ts = new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const events = [...((deposit.events ?? []) as Event[])];
      if (!events.some((event) => event.label === input.label)) {
        events.push({
          id: `${deposit.id}_${input.provider}_${ts.getTime()}`,
          label: input.label,
          description: input.description,
          timestamp: ts.toISOString(),
          status: "done",
        });
      }

      const changed = await tx.deposit.updateMany({
        where: { id: deposit.id, status: { in: [...OPEN_STATUSES] } },
        data: {
          status: "completed",
          completedAt: ts,
          ...(input.providerReference ? { providerReference: input.providerReference } : {}),
          events: events as Prisma.InputJsonValue,
        },
      });
      if (changed.count === 0) return { settled: false as const };

      await tx.wallet.update({
        where: { userId_wallet: { userId: deposit.userId, wallet: "deposit" } },
        data: { balance: { increment: amount } },
      });

      await tx.transaction.create({
        data: {
          reference: deposit.reference,
          userId: deposit.userId,
          type: "deposit",
          status: "successful",
          direction: "incoming",
          amount,
          fee: 0,
          netAmount: amount,
          wallet: "deposit",
          description:
            input.provider === "paypal"
              ? "PayPal deposit confirmed"
              : `M-Pesa deposit from ${mask(deposit.phone)}`,
          counterparty: input.provider === "paypal" ? "PayPal" : "Safaricom M-Pesa",
          depositId: deposit.id,
          createdAt: deposit.createdAt,
          events: events as Prisma.InputJsonValue,
        },
      });

      await postJournal(tx, {
        type: "deposit",
        description: `${input.provider === "paypal" ? "PayPal" : "M-Pesa"} deposit ${deposit.reference} settled`,
        actor: input.actor,
        userAccountNumber: deposit.user.accountNumber,
        reference: deposit.reference,
        entries: depositEntries(deposit.user.accountNumber, input.provider, toCents(amount)),
      });

      await tx.notification.create({
        data: {
          userId: deposit.userId,
          category: "transaction",
          title: "Deposit confirmed",
          message: `Your deposit of KES ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} has been confirmed and credited.`,
          actionUrl: `/records/${deposit.reference}`,
          actionLabel: "View record",
        },
      });

      if (input.audit) {
        await tx.auditLog.create({
          data: {
            actor: input.audit.actor,
            actorRole: input.audit.actorRole,
            action: "deposit.confirm",
            entityType: "deposit",
            entityId: deposit.reference,
            reason: input.audit.reason,
            oldValue: JSON.stringify({ status: deposit.status }),
            newValue: JSON.stringify({ status: "completed" }),
            ip: input.audit.ip,
          },
        });
      }

      return { settled: true as const };
    });

    const fresh = await prisma.deposit.findUnique({ where: { id: deposit.id } });
    return { settled: result.settled, deposit: fresh ?? deposit };
  } catch (error) {
    /* A concurrent settlement won the race and violated a unique reference. */
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const fresh = await prisma.deposit.findUnique({ where: { id: deposit.id } });
      return { settled: false as const, deposit: fresh ?? deposit };
    }
    throw error;
  }
}

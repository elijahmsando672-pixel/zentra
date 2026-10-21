import { prisma } from "@/lib/server/prisma";
import { generateReference } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import { isMpesaLiveConfigured } from "@/lib/server/payments";
import {
  earningEntries,
  postJournal,
  toCents,
  withdrawalPaidEntries,
} from "@/lib/server/ledger";
import { settleDeposit } from "@/lib/server/deposit-settlement";
import { recordPortfolioSnapshot } from "@/lib/server/portfolio";
import type { Withdrawal as PrismaWithdrawal, PayoutAccount as PrismaPayoutAccount } from "@prisma/client";

const mask = (phone: string) => phone.replace(/(\d{4})\d{3}(\d{3})/, "$1***$2");
const num = (value: unknown) => Number(value);
const round2 = (value: number) => Number(value.toFixed(2));

type Event = {
  id: string;
  label: string;
  description: string;
  timestamp: string;
  status: "done" | "current" | "upcoming";
};

function stableHash(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h;
}

/* ------------------------------------------------------------------ */
/* Deposits — settle ~7-12s after initiation (fails on the demo rules) */
/* ------------------------------------------------------------------ */

async function settleDeposits(userId: string) {
  /* Simulated settlement is only for the demo M-Pesa flow. Live Daraja
     deposits are verified through the provider, and PayPal deposits are
     only ever completed by an authorised staff member. */
  if (isMpesaLiveConfigured()) return;
  const pending = await prisma.deposit.findMany({ where: { userId, status: "pending", method: "mpesa" } });
  for (const d of pending) {
    const delay = 7_000 + (stableHash(d.id) % 6) * 1_000;
    if (Date.now() - d.createdAt.getTime() < delay) continue;

    const amount = num(d.amount);
    const willFail = amount % 13 === 0 || amount % 17 === 3;
    const ts = new Date();

    if (willFail) {
      const events = [...((d.events ?? []) as Event[])];
      events.push({
        id: `${d.id}_ev_fail`,
        label: "Payment failed",
        description: "The payment was cancelled or could not be completed on the handset.",
        timestamp: ts.toISOString(),
        status: "current",
      });
      await prisma.deposit.updateMany({
        where: { id: d.id, status: "pending" },
        data: {
          status: "failed",
          failureReason: "The payment was cancelled or could not be completed on the handset.",
          events,
        },
      });
      continue;
    }

    await settleDeposit({
      depositId: d.id,
      provider: "mpesa",
      actor: "system:settlement",
      label: "Payment confirmed",
      description: "M-Pesa receipt confirmed and wallet credited.",
    });
  }
}

/* ------------------------------------------------------------------ */
/* Withdrawals — pending → processing (12s) → paid (32s)              */
/* ------------------------------------------------------------------ */

type WithdrawalWithAccount = PrismaWithdrawal & { payoutAccount: PrismaPayoutAccount };

async function processWithdrawal(w: WithdrawalWithAccount) {
  const ts = new Date();
  const events = [...((w.events ?? []) as Event[])];
  for (const e of events) {
    if (e.label === "Awaiting approval") {
      e.label = "Approved";
      e.description = "Risk checks cleared. Processing payout.";
      e.status = "done";
      e.timestamp = ts.toISOString();
    }
  }
  events.push({
    id: `${w.id}_ev_proc`,
    label: "Processing payout",
    description: "Funds are being sent to M-Pesa.",
    timestamp: ts.toISOString(),
    status: "current",
  });
  const approvals = ((w.approvals ?? []) as Record<string, unknown>[]).map((a, i) =>
    i === 0 ? { ...a, action: "approved", at: ts.toISOString() } : a
  );

  const res = await prisma.withdrawal.updateMany({
    where: { id: w.id, status: "pending_approval" },
    data: {
      status: "processing",
      otpVerified: true,
      approvals: approvals as Prisma.InputJsonValue,
      events,
    },
  });
  if (res.count === 0) return;

  await prisma.transaction.updateMany({
    where: { userId: w.userId, withdrawalId: w.id },
    data: { status: "processing", events },
  });
}

async function payWithdrawal(w: WithdrawalWithAccount, accountNumber: string) {
  const ts = new Date();
  const events = ([...((w.events ?? []) as Event[])].filter(
    (e) => e.label !== "Awaiting approval" && e.label !== "Approved"
  )) as Event[];
  const processingIdx = events.findIndex((e) => e.label === "Processing payout");
  const processingEvent: Event = {
    id: `${w.id}_ev_paid`,
    label: "Sent to M-Pesa",
    description: `KES ${round2(num(w.netAmount)).toLocaleString()} sent to ${mask(w.payoutAccount.phone)}.`,
    timestamp: ts.toISOString(),
    status: "done",
  };
  if (processingIdx >= 0) events[processingIdx] = processingEvent;
  else events.push(processingEvent);
  events.push({
    id: `${w.id}_ev_paid_final`,
    label: "Paid",
    description: `KES ${round2(num(w.netAmount)).toLocaleString()} delivered to your M-Pesa number.`,
    timestamp: ts.toISOString(),
    status: "done",
  });

  const approvals = ((w.approvals ?? []) as Record<string, unknown>[]).map((a) => ({
    ...a,
    action: "approved",
    at: a.at ?? ts.toISOString(),
  }));

  await prisma.$transaction(async (tx) => {
    const res = await tx.withdrawal.updateMany({
      where: { id: w.id, status: { in: ["pending_approval", "processing"] } },
      data: { status: "paid", paidAt: ts, otpVerified: true, approvals, events },
    });
    if (res.count === 0) return;

    const walletDebit = await tx.wallet.updateMany({
      where: {
        userId: w.userId,
        wallet: "pending_withdrawal",
        balance: { gte: w.amount },
      },
      data: { balance: { decrement: w.amount } },
    });
    if (walletDebit.count === 0) throw new Error("Pending withdrawal wallet balance is inconsistent.");

    await tx.transaction.updateMany({
      where: { userId: w.userId, withdrawalId: w.id },
      data: { status: "successful", events },
    });
    await postJournal(tx, {
      type: "withdrawal",
      description: `Withdrawal ${w.reference} paid out`,
      actor: "system:settlement",
      userAccountNumber: accountNumber,
      reference: `${w.reference}-PAY`,
      entries: withdrawalPaidEntries(accountNumber, "mpesa", toCents(w.amount), toCents(w.fee)),
    });
    await tx.notification.create({
      data: {
        userId: w.userId,
        category: "transaction",
        title: "Withdrawal paid",
        message: `KES ${round2(num(w.netAmount)).toLocaleString(undefined, { minimumFractionDigits: 2 })} was sent to your M-Pesa number.`,
        actionUrl: "/records",
        actionLabel: "View record",
      },
    });
  });
}

async function advanceWithdrawals(userId: string, accountNumber: string) {
  const list = await prisma.withdrawal.findMany({
    where: { userId, status: { in: ["pending_approval", "processing"] } },
    include: { payoutAccount: true },
  });
  for (const w of list) {
    const age = Date.now() - w.createdAt.getTime();
    if (age >= 32_000) await payWithdrawal(w, accountNumber);
    else if (age >= 12_000 && w.status === "pending_approval") await processWithdrawal(w);
  }
}

/* ------------------------------------------------------------------ */
/* Earnings — credit each day's schedule entry once it falls due       */
/* ------------------------------------------------------------------ */

async function accrueEarnings(userId: string, accountNumber: string) {
  const investments = await prisma.investment.findMany({
    where: { userId, status: { in: ["active", "maturing"] } },
    include: { product: true },
  });

  for (const inv of investments) {
    const due = await prisma.earningEntry.findMany({
      where: { investmentId: inv.id, status: "scheduled", date: { lte: new Date() } },
      orderBy: { day: "asc" },
    });

    for (const entry of due) {
      const ts = new Date();
      await prisma.$transaction(async (tx) => {
        const res = await tx.earningEntry.updateMany({
          where: { id: entry.id, status: "scheduled" },
          data: { status: "credited", creditedAt: ts },
        });
        if (res.count === 0) return;

        await tx.wallet.update({
          where: { userId_wallet: { userId, wallet: "earnings" } },
          data: { balance: { increment: entry.amount } },
        });
        await tx.investment.update({
          where: { id: inv.id },
          data: { earnedToDate: { increment: entry.amount } },
        });

        await tx.transaction.create({
          data: {
            reference: `ERN-${entry.id}`,
            userId,
            type: "earning",
            status: "successful",
            direction: "incoming",
            amount: entry.amount,
            fee: 0,
            netAmount: entry.amount,
            wallet: "earnings",
            description: `Daily earning · ${inv.product.name} · Day ${entry.day}`,
            counterparty: inv.product.name,
            productId: inv.productId,
            createdAt: ts,
            events: [
              {
                id: `${entry.id}_txev`,
                label: "Earning credited",
                description: `Day ${entry.day} earning credited.`,
                timestamp: ts.toISOString(),
                status: "done",
              },
            ],
          },
        });
        await postJournal(tx, {
          type: "earning",
          description: `${inv.product.name} day ${entry.day} earning for ${inv.reference}`,
          actor: "system:engine",
          userAccountNumber: accountNumber,
          reference: `ERN-${entry.id}`,
          entries: earningEntries(accountNumber, toCents(entry.amount)),
        });
      });
    }

    if (inv.status !== "completed" && Date.now() >= inv.maturityDate.getTime()) {
      await prisma.investment.update({ where: { id: inv.id }, data: { status: "completed" } });
    }
  }
}

export async function runDueJobs(userId: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { accountNumber: true } });
    if (!user) return;
    await settleDeposits(userId);
    await advanceWithdrawals(userId, user.accountNumber);
    await accrueEarnings(userId, user.accountNumber);
    await recordPortfolioSnapshot(userId);
  } catch (error) {
    console.error("[engine]", error);
  }
}

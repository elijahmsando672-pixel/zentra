import { prisma } from "@/lib/server/prisma";
import { ok, fail, unauthorized, serverError, notFound } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import { capturePaypalOrder, isPaypalLiveConfigured } from "@/lib/server/payments";
import { Prisma } from "@prisma/client";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const deposit = await prisma.deposit.findFirst({ where: { id, userId: user.id } });
    if (!deposit) return notFound("Deposit not found.");
    if (deposit.method !== "paypal") return fail("This deposit is not a PayPal payment.", "wrong_method");
    if (deposit.status !== "pending") return fail("This deposit is no longer awaiting capture.", "not_pending");
    if (!isPaypalLiveConfigured()) {
      return fail(
        "Live PayPal checkout is not configured. Enter the reference you sent and operations will verify it.",
        "not_configured"
      );
    }
    if (!deposit.checkoutRequestId) return fail("This deposit has no PayPal order to capture.", "no_order");

    const capture = await capturePaypalOrder(deposit.checkoutRequestId);
    if (!capture || capture.status !== "COMPLETED" || capture.captureId === "") {
      return fail(
        capture && capture.status ? `PayPal returned "${capture.status}" — the payment was not completed.` : "Unable to confirm the PayPal payment with the provider.",
        "capture_failed"
      );
    }

    /* Only credit when the provider confirms COMPLETED (and, if possible, the amount). */
    const ts = new Date();
    const events = [...((deposit.events ?? []) as Record<string, unknown>[])];
    events.push({
      id: `${deposit.id}_ev_${ts.getTime()}`,
      label: "Payment confirmed",
      description: `PayPal capture ${capture.captureId?.slice(0, 12)}… confirmed and wallet credited.`,
      timestamp: ts.toISOString(),
      status: "done",
    });

    await prisma.$transaction(async (tx) => {
      const res = await tx.deposit.updateMany({
        where: { id: deposit.id, status: "pending" },
        data: { status: "completed", completedAt: ts, events: events as Prisma.InputJsonValue },
      });
      if (res.count === 0) throw new Error("concurrent_update");
      await tx.wallet.update({
        where: { userId_wallet: { userId: user.id, wallet: "deposit" } },
        data: { balance: { increment: Number(deposit.amount) } },
      });
      await tx.transaction.create({
        data: {
          reference: deposit.reference,
          userId: user.id,
          type: "deposit",
          status: "successful",
          direction: "incoming",
          amount: Number(deposit.amount),
          fee: 0,
          netAmount: Number(deposit.amount),
          wallet: "deposit",
          description: "PayPal deposit confirmed",
          counterparty: "PayPal",
          depositId: deposit.id,
          createdAt: deposit.createdAt,
          events: events as Prisma.InputJsonValue,
        },
      });
      await tx.notification.create({
        data: {
          userId: user.id,
          category: "transaction",
          title: "Deposit confirmed",
          message: `Your PayPal deposit of KES ${Number(deposit.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} has been confirmed.`,
          actionUrl: "/records",
          actionLabel: "View record",
        },
      });
    });

    const fresh = await prisma.deposit.findFirst({ where: { id: deposit.id } });
    return ok({ done: true as const, deposit: fresh ?? deposit });
  } catch (error) {
    if (String(error).includes("concurrent_update")) return fail("This deposit was already confirmed.", "already_reviewed", undefined, 409);
    return serverError(error);
  }
}
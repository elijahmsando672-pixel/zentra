import { prisma } from "@/lib/server/prisma";
import { fail, ok, readJson, serverError } from "@/lib/server/api";
import { isMpesaLiveConfigured, queryMpesaStk } from "@/lib/server/payments";
import { settleDeposit } from "@/lib/server/deposit-settlement";
import { Prisma } from "@prisma/client";

type CallbackMetadataItem = { Name?: string; Value?: string | number };
type StkCallback = {
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  ResultCode?: number | string;
  ResultDesc?: string;
  CallbackMetadata?: { Item?: CallbackMetadataItem[] };
};

const mask = (phone: string) => phone.replace(/(\d{4})\d{3}(\d{3})/, "$1***$2");

/**
 * Safaricom Daraja STK callback.
 *
 * The callback body is never trusted on its own: whenever it says the payment
 * succeeded we re-query the STK status from Daraja server-side and only then
 * settle the deposit. Settlement is idempotent, so repeated callbacks and the
 * polling fallback in GET /api/deposits/[id] cannot double-credit a wallet.
 */
export async function POST(req: Request) {
  try {
    if (!isMpesaLiveConfigured()) {
      return fail("M-Pesa is not configured for this environment.", "not_configured", undefined, 404);
    }

    const body = await readJson(req).catch(() => null);
    const callback: StkCallback | undefined = body?.Body?.stkCallback;
    const checkoutRequestId = String(callback?.CheckoutRequestID ?? "").trim();
    if (!checkoutRequestId) return fail("Malformed callback payload.", "invalid_payload");

    const deposit = await prisma.deposit.findFirst({
      where: { checkoutRequestId, method: "mpesa" },
      include: { user: { select: { accountNumber: true } } },
    });
    if (!deposit) return ok({ received: true as const });

    /* Ignore callbacks for deposits that have already reached a terminal state. */
    if (!["pending", "initiated"].includes(deposit.status)) {
      return ok({ received: true as const });
    }

    const verified = await queryMpesaStk(checkoutRequestId);
    if (!verified) {
      /* Provider is temporarily unreachable — acknowledge so Daraja does not
         hammer the endpoint; polling will reconcile the status shortly. */
      return ok({ received: true as const, deferred: true as const });
    }

    const callbackAmount = callback?.CallbackMetadata?.Item?.find((item) => item.Name === "Amount")?.Value;
    if (callbackAmount !== undefined && Math.round(Number(callbackAmount) * 100) !== Math.round(Number(deposit.amount) * 100)) {
      await prisma.deposit.updateMany({
        where: { id: deposit.id, status: { in: ["pending", "initiated"] } },
        data: {
          status: "failed",
          failureReason: "The confirmed amount did not match the requested deposit amount.",
        },
      });
      return ok({ received: true as const });
    }

    if (verified.resultCode === "0") {
      const receipt = callback?.CallbackMetadata?.Item?.find((item) => item.Name === "MpesaReceiptNumber")?.Value;
      await settleDeposit({
        depositId: deposit.id,
        provider: "mpesa",
        actor: "mpesa:callback",
        label: "Payment confirmed",
        description: `M-Pesa receipt confirmed for ${mask(deposit.phone)} and wallet credited.`,
        providerReference: receipt !== undefined ? String(receipt) : undefined,
      });
      return ok({ received: true as const });
    }

    if (["1032", "1037", "1"].includes(String(verified.resultCode))) {
      return ok({ received: true as const, deferred: true as const });
    }

    const ts = new Date();
    const events = [...((deposit.events ?? []) as Record<string, unknown>[])];
    events.push({
      id: `${deposit.id}_ev_${ts.getTime()}`,
      label: "Payment failed",
      description: verified.resultDesc || callback?.ResultDesc || "The payment could not be completed.",
      timestamp: ts.toISOString(),
      status: "current",
    });
    await prisma.deposit.updateMany({
      where: { id: deposit.id, status: { in: ["pending", "initiated"] } },
      data: {
        status: "failed",
        failureReason: verified.resultDesc || callback?.ResultDesc || "The payment could not be completed.",
        events: events as Prisma.InputJsonValue,
      },
    });
    return ok({ received: true as const });
  } catch (error) {
    return serverError(error);
  }
}

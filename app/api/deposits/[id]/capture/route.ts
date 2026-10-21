import { prisma } from "@/lib/server/prisma";
import { ok, fail, unauthorized, serverError, notFound } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import { capturePaypalOrder, isPaypalLiveConfigured } from "@/lib/server/payments";
import { settleDeposit } from "@/lib/server/deposit-settlement";

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

    /* Only credit when the provider confirms COMPLETED. The settlement helper
       re-checks the pending status inside a transaction, credits the wallet,
       writes the customer-facing transaction and posts the balanced journal. */
    const result = await settleDeposit({
      depositId: deposit.id,
      provider: "paypal",
      actor: "paypal:capture",
      label: "Payment confirmed",
      description: `PayPal capture ${capture.captureId.slice(0, 12)}… confirmed and wallet credited.`,
      providerReference: capture.captureId,
    });

    if (!result.settled && result.deposit?.status !== "completed") {
      return fail("This deposit could not be confirmed. Please contact support.", "capture_failed", undefined, 409);
    }

    return ok({ done: true as const, deposit: result.deposit ?? deposit });
  } catch (error) {
    return serverError(error);
  }
}
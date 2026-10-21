import { prisma } from "@/lib/server/prisma";
import { ok, notFound, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import { mapDeposit } from "@/lib/server/mappers";
import { runDueJobs } from "@/lib/server/engine";
import { settleDeposit } from "@/lib/server/deposit-settlement";
import { isMpesaLiveConfigured, queryMpesaStk } from "@/lib/server/payments";
import { Prisma } from "@prisma/client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;

    /* Demo/other flows settle through the background engine. Live Daraja
       deposits are settled below by querying the provider directly. */
    if (!isMpesaLiveConfigured()) {
      await runDueJobs(user.id);
    }

    const deposit = await prisma.deposit.findFirst({
      where: { userId: user.id, OR: [{ id }, { reference: id }] },
    });
    if (!deposit) return notFound("Deposit not found.");

    /* Live Daraja: verify the STK payment against the provider server-side. */
    if (
      isMpesaLiveConfigured() &&
      deposit.method === "mpesa" &&
      (deposit.status === "pending" || deposit.status === "initiated") &&
      deposit.checkoutRequestId
    ) {
      try {
        const result = await queryMpesaStk(deposit.checkoutRequestId);
        if (result) {
          const settled = result.resultCode === "0";
          const ts = new Date();
          const events = [...((deposit.events ?? []) as Record<string, unknown>[])];
          events.push({
            id: `${deposit.id}_ev_${ts.getTime()}`,
            label: settled ? "Payment confirmed" : "Payment failed",
            description: settled ? "M-Pesa receipt confirmed and wallet credited." : result.resultDesc || "The payment could not be completed.",
            timestamp: ts.toISOString(),
            status: settled ? "done" : "current",
          });
          if (settled) {
            await settleDeposit({
              depositId: deposit.id,
              provider: "mpesa",
              actor: "system:provider-verification",
              label: "Payment confirmed",
              description: "M-Pesa receipt confirmed and wallet credited.",
            });
          } else {
            await prisma.deposit.updateMany({
              where: { id: deposit.id, status: { in: ["pending", "initiated"] } },
              data: { status: "failed", failureReason: result.resultDesc, events: events as Prisma.InputJsonValue },
            });
          }
        }
      } catch (error) {
        console.error("[deposits][daraja-query]", error);
      }
    }

    const fresh = await prisma.deposit.findFirst({
      where: { userId: user.id, OR: [{ id }, { reference: id }] },
    });
    return ok(mapDeposit(fresh ?? deposit));
  } catch (error) {
    return serverError(error);
  }
}

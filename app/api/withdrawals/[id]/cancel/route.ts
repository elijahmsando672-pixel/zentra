import { prisma } from "@/lib/server/prisma";
import { ok, fail, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";

type Event = { id: string; label: string; description: string; timestamp: string; status: string };

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;

    const wd = await prisma.withdrawal.findFirst({ where: { id, userId: user.id } });
    if (!wd) return fail("Withdrawal not found.", "not_found");
    if (wd.status !== "pending_approval") {
      return fail("Only requests awaiting approval can be cancelled.", "not_cancellable");
    }

    const ts = new Date();
    const events = [...((wd.events ?? []) as Event[])];
    events.push({
      id: `${id}_ev_cancel`,
      label: "Cancelled",
      description: "The request was cancelled and funds returned to your wallet.",
      timestamp: ts.toISOString(),
      status: "current",
    });

    const cancelled = await prisma.$transaction(async (tx) => {
      const res = await tx.withdrawal.updateMany({
        where: { id, userId: user.id, status: "pending_approval" },
        data: { status: "cancelled", events },
      });
      if (res.count === 0) return false;
      const pendingDebit = await tx.wallet.updateMany({
        where: { userId: user.id, wallet: "pending_withdrawal", balance: { gte: wd.amount } },
        data: { balance: { decrement: wd.amount } },
      });
      if (pendingDebit.count === 0) throw new Error("Pending withdrawal wallet balance is inconsistent.");
      await tx.wallet.update({
        where: { userId_wallet: { userId: user.id, wallet: wd.wallet } },
        data: { balance: { increment: wd.amount } },
      });
      await tx.transaction.updateMany({
        where: { userId: user.id, withdrawalId: id },
        data: { status: "cancelled", events },
      });
      return true;
    });
    if (!cancelled) return fail("Only requests awaiting approval can be cancelled.", "not_cancellable");

    return ok({ done: true as const });
  } catch (error) {
    return serverError(error);
  }
}

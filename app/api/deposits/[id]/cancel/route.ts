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

    const deposit = await prisma.deposit.findFirst({ where: { id, userId: user.id } });
    if (!deposit) return fail("Deposit not found.", "not_found");
    if (deposit.status !== "pending") {
      return fail("This request is no longer pending.", "not_pending");
    }

    const events = [...((deposit.events ?? []) as Event[])];
    events.push({
      id: `${deposit.id}_ev_cancel`,
      label: "Cancelled",
      description: "The request was cancelled from the app.",
      timestamp: new Date().toISOString(),
      status: "current",
    });

    await prisma.deposit.updateMany({
      where: { id: deposit.id, status: "pending" },
      data: {
        status: "cancelled",
        failureReason: "Cancelled by member before confirmation.",
        events,
      },
    });

    return ok({ done: true as const });
  } catch (error) {
    return serverError(error);
  }
}

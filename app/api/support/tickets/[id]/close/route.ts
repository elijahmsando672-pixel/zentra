import { prisma } from "@/lib/server/prisma";
import { ok, fail, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;

    const ticket = await prisma.supportTicket.findFirst({ where: { id, userId: user.id } });
    if (!ticket) return fail("Ticket not found.", "not_found");

    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: "closed", updatedAt: new Date() },
    });
    return ok({ done: true as const });
  } catch (error) {
    return serverError(error);
  }
}

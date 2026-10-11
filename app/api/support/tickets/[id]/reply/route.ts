import { prisma } from "@/lib/server/prisma";
import { ok, fail, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const text = String(body.body ?? "").trim();
    if (!text) return fail("Message cannot be empty.", "empty");

    const ticket = await prisma.supportTicket.findFirst({ where: { id, userId: user.id } });
    if (!ticket) return fail("Ticket not found.", "not_found");

    const status =
      ticket.status === "waiting_on_you" || ticket.status === "resolved" ? "in_progress" : ticket.status;

    await prisma.$transaction([
      prisma.supportMessage.create({
        data: { ticketId: ticket.id, author: user.fullName, authorRole: "user", body: text },
      }),
      prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { updatedAt: new Date(), lastReplyBy: "user", status },
      }),
    ]);

    return ok({ done: true as const });
  } catch (error) {
    return serverError(error);
  }
}

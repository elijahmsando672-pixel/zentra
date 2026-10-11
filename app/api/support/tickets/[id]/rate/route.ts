import { prisma } from "@/lib/server/prisma";
import { ok, fail, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const rating = Number(body.rating);
    if (![1, 2, 3, 4, 5].includes(rating)) return fail("Please choose a rating from 1 to 5.", "invalid_rating");

    const ticket = await prisma.supportTicket.findFirst({ where: { id, userId: user.id } });
    if (!ticket) return fail("Ticket not found.", "not_found");

    await prisma.supportTicket.update({ where: { id: ticket.id }, data: { satisfaction: rating } });
    return ok({ done: true as const });
  } catch (error) {
    return serverError(error);
  }
}

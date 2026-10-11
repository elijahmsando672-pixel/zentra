import { prisma } from "@/lib/server/prisma";
import { ok, fail, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import { mapSupportTicket } from "@/lib/server/mappers";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;

    const ticket = await prisma.supportTicket.findFirst({
      where: { userId: user.id, OR: [{ id }, { reference: id }] },
      include: { messages: true },
    });
    if (!ticket) return fail("That ticket could not be found.", "not_found");

    return ok(mapSupportTicket(ticket));
  } catch (error) {
    return serverError(error);
  }
}

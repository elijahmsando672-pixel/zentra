import { prisma } from "@/lib/server/prisma";
import { ok, fail, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;

    const session = await prisma.session.findFirst({ where: { id, userId: user.id } });
    if (!session) return fail("Session not found.", "not_found");

    await prisma.session.update({ where: { id }, data: { revokedAt: new Date() } });
    return ok({ done: true as const });
  } catch (error) {
    return serverError(error);
  }
}

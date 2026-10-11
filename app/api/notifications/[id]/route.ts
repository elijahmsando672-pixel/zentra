import { prisma } from "@/lib/server/prisma";
import { ok, fail, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;

    const found = await prisma.notification.findFirst({ where: { id, userId: user.id } });
    if (!found) return fail("Notification not found.", "not_found");

    await prisma.notification.update({ where: { id }, data: { read: true } });
    return ok({ done: true as const });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;

    const found = await prisma.notification.findFirst({ where: { id, userId: user.id } });
    if (!found) return fail("Notification not found.", "not_found");

    await prisma.notification.delete({ where: { id } });
    return ok({ done: true as const });
  } catch (error) {
    return serverError(error);
  }
}

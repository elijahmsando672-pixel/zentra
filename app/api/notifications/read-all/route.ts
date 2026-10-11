import { prisma } from "@/lib/server/prisma";
import { ok, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
    return ok({ done: true as const });
  } catch (error) {
    return serverError(error);
  }
}

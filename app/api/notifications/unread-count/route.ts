import { prisma } from "@/lib/server/prisma";
import { ok, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const count = await prisma.notification.count({
      where: { userId: user.id, read: false },
    });
    return ok({ count });
  } catch (error) {
    return serverError(error);
  }
}

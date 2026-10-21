import { prisma } from "@/lib/server/prisma";
import { ok, readJson, serverError, unauthorized } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const body = await readJson(req);
    const enabled = Boolean(body.enabled);

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: enabled },
    });

    return ok({ done: true as const });
  } catch (error) {
    return serverError(error);
  }
}

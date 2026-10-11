import { cookies } from "next/headers";
import { prisma } from "@/lib/server/prisma";
import { ok, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser, hashToken, SESSION_COOKIE } from "@/lib/server/session";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const store = await cookies();
    const raw = store.get(SESSION_COOKIE)?.value;
    const currentHash = raw ? hashToken(raw) : null;

    await prisma.session.updateMany({
      where: {
        userId: user.id,
        revokedAt: null,
        NOT: currentHash ? { token: currentHash } : undefined,
      },
      data: { revokedAt: new Date() },
    });

    return ok({ done: true as const });
  } catch (error) {
    return serverError(error);
  }
}

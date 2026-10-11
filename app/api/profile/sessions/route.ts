import { prisma } from "@/lib/server/prisma";
import { ok, unauthorized, serverError } from "@/lib/server/api";
import { getAuth } from "@/lib/server/session";
import { mapSession } from "@/lib/server/mappers";
import { hashToken, SESSION_COOKIE } from "@/lib/server/session";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const auth = await getAuth();
    if (!auth) return unauthorized();
    const store = await cookies();
    const raw = store.get(SESSION_COOKIE)?.value;
    const currentHash = raw ? hashToken(raw) : null;

    const sessions = await prisma.session.findMany({
      where: { userId: auth.userId },
      orderBy: { lastSeenAt: "desc" },
    });

    return ok(sessions.map((s) => mapSession(s, currentHash)));
  } catch (error) {
    return serverError(error);
  }
}

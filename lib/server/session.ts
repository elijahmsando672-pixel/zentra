import { cookies, headers } from "next/headers";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/server/prisma";

export const SESSION_COOKIE = "zentra_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "197.232.91.14";
  const userAgent = h.get("user-agent") ?? "This device";
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: { token: hashToken(token), userId, ip, userAgent, expiresAt },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

export async function getAuth() {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const session = await prisma.session.findUnique({
    where: { token: hashToken(raw) },
    include: { user: true },
  });
  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
  return session;
}

export async function getCurrentUser() {
  const session = await getAuth();
  return session?.user ?? null;
}

export async function destroyCurrentSession() {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (raw) {
    await prisma.session.updateMany({
      where: { token: hashToken(raw) },
      data: { revokedAt: new Date() },
    });
  }
  store.delete(SESSION_COOKIE);
}

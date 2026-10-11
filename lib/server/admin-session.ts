import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/server/prisma";

const COOKIE = "zentra_admin_session";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export async function createAdminSession(staffId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
  await prisma.adminSession.create({ data: { staffId, token: hash(token), expiresAt } });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function getAdminStaff() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.adminSession.findUnique({ where: { token: hash(token) }, include: { staff: true } });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.staff.status !== "active") return null;
  return session.staff;
}

export async function destroyAdminSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await prisma.adminSession.updateMany({ where: { token: hash(token) }, data: { revokedAt: new Date() } });
  store.delete(COOKIE);
}

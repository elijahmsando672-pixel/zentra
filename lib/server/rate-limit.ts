import { createHash } from "node:crypto";
import { prisma } from "@/lib/server/prisma";

/** Database-backed fixed-window limit shared across app instances. */
export async function consumeRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = Math.floor(now / windowMs);
  const windowEndsAt = new Date((bucket + 1) * windowMs);
  const hashedKey = createHash("sha256").update(`${key}:${bucket}`).digest("hex");
  const counter = await prisma.authRateLimit.upsert({
    where: { key: hashedKey },
    create: { key: hashedKey, windowEndsAt, count: 1 },
    update: { count: { increment: 1 } },
    select: { count: true },
  });
  return { allowed: counter.count <= limit, retryAfterSeconds: Math.max(1, Math.ceil((windowEndsAt.getTime() - now) / 1000)) };
}

export function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

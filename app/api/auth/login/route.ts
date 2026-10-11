import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { prisma } from "@/lib/server/prisma";
import { ok, fail, serverError } from "@/lib/server/api";
import { createSession } from "@/lib/server/session";
import { mapUser, parseUserAgent } from "@/lib/server/mappers";
import { normalizePhoneKE } from "@/lib/utils";
import { consumeRateLimit, requestIp } from "@/lib/server/rate-limit";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const identifier = String(body.identifier ?? "").trim();
    const password = String(body.password ?? "");
    const normalized = identifier.includes("@")
      ? identifier.toLowerCase()
      : normalizePhoneKE(identifier);

    const ipLimit = await consumeRateLimit(`login:ip:${requestIp(req)}`, 30, 15 * 60_000);
    const identityLimit = await consumeRateLimit(`login:identity:${normalized}`, 8, 15 * 60_000);
    if (!ipLimit.allowed || !identityLimit.allowed) {
      const response = fail("Too many sign-in attempts. Please try again later.", "rate_limited", undefined, 429);
      response.headers.set("Retry-After", String(Math.max(ipLimit.retryAfterSeconds, identityLimit.retryAfterSeconds)));
      return response;
    }

    const user = await prisma.user.findFirst({
      where: { OR: [{ phone: normalized }, { email: normalized }] },
    });

    if (!user) {
      return fail("We could not find an account with those details.", "not_found", {
        identifier: "Check your phone/email and try again.",
      });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return fail("Incorrect password. Please try again.", "bad_credentials", {
        password: "Incorrect password.",
      });
    }

    const h = await headers();
    const { device } = parseUserAgent(h.get("user-agent"));
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "197.232.91.14";

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip, device, status: user.status === "pending" ? "active" : user.status },
    });

    await createSession(user.id);

    return ok({
      user: mapUser(updated),
    });
  } catch (error) {
    return serverError(error);
  }
}

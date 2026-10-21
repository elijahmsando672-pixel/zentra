import { randomInt } from "node:crypto";
import { prisma } from "@/lib/server/prisma";
import { fail, ok, readJson, serverError } from "@/lib/server/api";
import { normalizePhoneKE } from "@/lib/utils";
import { consumeRateLimit, requestIp } from "@/lib/server/rate-limit";

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const raw = String(body.target ?? "").trim();
    const key = raw.includes("@") ? raw.toLowerCase() : normalizePhoneKE(raw);
    if (!key) return fail("Enter a valid phone number or email address.", "invalid_target");
    const ipLimit = await consumeRateLimit(`otp-request:ip:${requestIp(req)}`, 20, 15 * 60_000);
    const targetLimit = await consumeRateLimit(`otp-request:target:${key}`, 4, 15 * 60_000);
    if (!ipLimit.allowed || !targetLimit.allowed) {
      const response = fail("Too many verification code requests. Please try again later.", "rate_limited", undefined, 429);
      response.headers.set("Retry-After", String(Math.max(ipLimit.retryAfterSeconds, targetLimit.retryAfterSeconds)));
      return response;
    }
    const code = String(randomInt(100000, 1_000_000));

    await prisma.otpCode.deleteMany({ where: { target: key, consumedAt: null } });
    await prisma.otpCode.create({
      data: {
        target: key,
        purpose: "verify",
        code,
        expiresAt: new Date(Date.now() + 10 * 60_000),
      },
    });

    return ok({ channel: raw.includes("@") ? "email" : "sms", demoCode: code });
  } catch (error) {
    return serverError(error);
  }
}

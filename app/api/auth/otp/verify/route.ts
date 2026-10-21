import { prisma } from "@/lib/server/prisma";
import { fail, ok, readJson, serverError } from "@/lib/server/api";
import { createSession } from "@/lib/server/session";
import { normalizePhoneKE } from "@/lib/utils";
import { consumeRateLimit, requestIp } from "@/lib/server/rate-limit";

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const raw = String(body.target ?? "").trim();
    const code = String(body.code ?? "").trim();
    const key = raw.includes("@") ? raw.toLowerCase() : normalizePhoneKE(raw);
    const ipLimit = await consumeRateLimit(`otp-verify:ip:${requestIp(req)}`, 30, 15 * 60_000);
    const targetLimit = await consumeRateLimit(`otp-verify:target:${key}`, 8, 15 * 60_000);
    if (!ipLimit.allowed || !targetLimit.allowed) {
      const response = fail("Too many verification attempts. Please try again later.", "rate_limited", undefined, 429);
      response.headers.set("Retry-After", String(Math.max(ipLimit.retryAfterSeconds, targetLimit.retryAfterSeconds)));
      return response;
    }

    const otp = await prisma.otpCode.findFirst({
      where: { target: key, consumedAt: null, attempts: { lt: 5 }, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });

    if (!otp) {
      return fail("No pending verification for this account.", "no_otp");
    }
    if (otp.code !== code) {
      const failedAttempt = await prisma.otpCode.updateMany({
        where: { id: otp.id, consumedAt: null, attempts: { lt: 5 } },
        data: { attempts: { increment: 1 } },
      });
      if (failedAttempt.count === 0) return fail("This verification code has expired. Request a new one.", "no_otp");
      return fail("That code is not correct. Please check and try again.", "bad_otp", {
        code: "Invalid code.",
      });
    }

    const consumed = await prisma.otpCode.updateMany({
      where: { id: otp.id, consumedAt: null, attempts: { lt: 5 }, expiresAt: { gt: new Date() } },
      data: { consumedAt: new Date() },
    });
    if (consumed.count === 0) return fail("This verification code has already been used or expired.", "no_otp");

    const user = await prisma.user.findFirst({
      where: { OR: [{ phone: key }, { email: key }] },
    });

    if (user) {
      const isPhone = user.phone === key;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          phoneVerified: isPhone ? true : user.phoneVerified,
          emailVerified: isPhone ? user.emailVerified : true,
          verificationStatus: "verified",
          status: "active",
          profileCompletion: Math.max(user.profileCompletion, 55),
        },
      });
      await createSession(user.id);
    }

    return ok({ verified: true as const });
  } catch (error) {
    return serverError(error);
  }
}

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/server/prisma";
import { fail, ok, serverError } from "@/lib/server/api";
import { createAdminSession } from "@/lib/server/admin-session";
import { consumeRateLimit, requestIp } from "@/lib/server/rate-limit";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const ip = requestIp(req);

    const ipLimit = await consumeRateLimit(`admin-login:ip:${ip}`, 20, 15 * 60_000);
    const identityLimit = await consumeRateLimit(`admin-login:identity:${email}`, 6, 15 * 60_000);
    if (!ipLimit.allowed || !identityLimit.allowed) {
      const response = fail("Too many staff sign-in attempts. Try again later.", "rate_limited", undefined, 429);
      response.headers.set("Retry-After", String(Math.max(ipLimit.retryAfterSeconds, identityLimit.retryAfterSeconds)));
      return response;
    }

    const staff = await prisma.adminStaff.findUnique({ where: { email } });
    if (!staff || !staff.passwordHash || !(await bcrypt.compare(password, staff.passwordHash))) {
      return fail("Invalid staff credentials.", "bad_credentials", undefined, 401);
    }
    if (staff.status !== "active") return fail("This staff account is not active. Contact an administrator.", "inactive", undefined, 403);
    await createAdminSession(staff.id);
    await prisma.$transaction([
      prisma.adminStaff.update({ where: { id: staff.id }, data: { lastActiveAt: new Date() } }),
      prisma.auditLog.create({
        data: {
          actor: staff.fullName,
          actorRole: staff.role,
          action: "admin.login",
          entityType: "admin_staff",
          entityId: staff.id,
          reason: "Successful staff sign-in.",
          oldValue: null,
          newValue: null,
          ip,
        },
      }),
    ]);
    return ok({ ok: true as const, staffName: staff.fullName });
  } catch (error) {
    return serverError(error);
  }
}

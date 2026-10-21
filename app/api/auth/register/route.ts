import bcrypt from "bcryptjs";
import { prisma } from "@/lib/server/prisma";
import { ok, fail, serverError } from "@/lib/server/api";
import { mapUser } from "@/lib/server/mappers";
import { normalizePhoneKE } from "@/lib/utils";
import { getGlobalSettings } from "@/lib/server/settings";
import { consumeRateLimit, requestIp } from "@/lib/server/rate-limit";
import { isUniqueConstraintError } from "@/lib/server/idempotency";

const DEFAULT_WALLETS = [
  { wallet: "deposit" as const, locked: false },
  { wallet: "investment" as const, locked: true },
  { wallet: "earnings" as const, locked: false },
  { wallet: "team_rewards" as const, locked: false },
  { wallet: "bonus" as const, locked: false },
  { wallet: "pending_withdrawal" as const, locked: true },
  { wallet: "locked" as const, locked: true },
];

export async function POST(req: Request) {
  try {
    const settings = await getGlobalSettings();
    if (settings.maintenanceMode || !settings.registrationsOpen) {
      return fail("New registrations are temporarily paused. Please try again later.", "registrations_closed", undefined, 503);
    }
    const limit = await consumeRateLimit(`register:ip:${requestIp(req)}`, 10, 60 * 60_000);
    if (!limit.allowed) {
      const response = fail("Too many registration attempts. Please try again later.", "rate_limited", undefined, 429);
      response.headers.set("Retry-After", String(limit.retryAfterSeconds));
      return response;
    }

    const body = await req.json();
    const fullName = String(body.fullName ?? "").trim();
    const phone = normalizePhoneKE(String(body.phone ?? ""));
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const inviteCode = body.inviteCode ? String(body.inviteCode).trim() : undefined;

    const fieldErrors: Record<string, string> = {};
    if (!fullName) fieldErrors.fullName = "Enter your full name.";
    if (!/^254(7|1)\d{8}$/.test(phone)) fieldErrors.phone = "Use a format like 0712 345 678.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fieldErrors.email = "Enter a valid email address.";
    if (password.length < 8) fieldErrors.password = "Use at least 8 characters.";
    if (Object.keys(fieldErrors).length > 0) {
      return fail("Please correct the highlighted fields.", "validation", fieldErrors);
    }

    if (await prisma.user.findUnique({ where: { phone } })) {
      return fail("An account with this phone number already exists.", "duplicate_phone", {
        phone: "This phone number is already registered.",
      });
    }
    if (await prisma.user.findUnique({ where: { email } })) {
      return fail("An account with this email already exists.", "duplicate_email", {
        email: "This email is already registered.",
      });
    }

    const sponsor = inviteCode
      ? await prisma.user.findFirst({ where: { referralCode: inviteCode.toUpperCase() } })
      : null;

    const count = await prisma.user.count();
    const base = (fullName.split(" ")[0] || "user").slice(0, 4).toUpperCase();
    let referralCode = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
    for (let i = 0; i < 5; i++) {
      const clash = await prisma.user.findUnique({ where: { referralCode } });
      if (!clash) break;
      referralCode = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    let accountNumber = `NX-${101000 + count * 7}`;
    const now = new Date();

    let user;
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        user = await prisma.user.create({
          data: {
            accountNumber,
            fullName,
            phone,
            email,
            passwordHash,
            joinedAt: now,
            referralCode,
            referredBy: sponsor ? `${sponsor.fullName} (${sponsor.accountNumber})` : null,
            rank: "member",
            status: "pending",
            riskLevel: "low",
            lastLoginAt: now,
            lastLoginIp: "197.232.91.14",
            device: "This device",
            notificationPreferences: {
              email: true,
              sms: true,
              push: true,
              withdrawals: true,
              earnings: true,
              team: true,
              promotions: true,
            },
            wallets: { create: DEFAULT_WALLETS },
          },
        });
        break;
      } catch (error) {
        if (!isUniqueConstraintError(error) || attempt === 5) throw error;
        accountNumber = `NX-${101000 + count * 7 + attempt + 1}-${Math.floor(Math.random() * 90 + 10)}`;
      }
    }
    if (!user) return serverError(new Error("Unable to allocate a unique account number."));

    return ok({ user: mapUser(user), verificationRequired: true as const });
  } catch (error) {
    return serverError(error);
  }
}

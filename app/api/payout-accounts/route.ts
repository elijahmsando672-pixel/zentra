import { prisma } from "@/lib/server/prisma";
import { ok, fail, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import { mapPayoutAccount } from "@/lib/server/mappers";
import { normalizePhoneKE } from "@/lib/utils";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const accounts = await prisma.payoutAccount.findMany({
      where: { userId: user.id },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });
    return ok(accounts.map(mapPayoutAccount));
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const body = await req.json();
    const nickname = String(body.nickname ?? "").trim();
    const phone = normalizePhoneKE(String(body.phone ?? ""));

    if (!nickname) return fail("Give this account a nickname.", "invalid", { nickname: "Required." });
    if (!/^254(7|1)\d{8}$/.test(phone)) {
      return fail("Enter a valid M-Pesa number.", "invalid_phone", {
        phone: "Use a format like 0712 345 678.",
      });
    }

    const existing = await prisma.payoutAccount.findMany({ where: { userId: user.id } });
    if (existing.some((a) => a.phone === phone)) {
      return fail("This M-Pesa number is already saved.", "duplicate", { phone: "Already saved." });
    }
    if (existing.length >= 5) {
      return fail("You can save up to 5 payout accounts.", "limit");
    }

    await prisma.payoutAccount.create({
      data: {
        userId: user.id,
        nickname,
        phone,
        provider: "mpesa",
        isPrimary: existing.length === 0,
        verified: false,
      },
    });

    return ok({ done: true as const });
  } catch (error) {
    return serverError(error);
  }
}

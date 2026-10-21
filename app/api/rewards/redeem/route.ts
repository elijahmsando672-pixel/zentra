import { prisma } from "@/lib/server/prisma";
import { fail, ok, readJson, serverError, unauthorized } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import { mapBonusAward } from "@/lib/server/mappers";

const round2 = (n: number) => Number(n.toFixed(2));

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const body = await readJson(req).catch(() => ({}));
    const code = String(body.code ?? "").trim().toUpperCase();
    if (!code) return fail("Enter a coupon code to continue.", "not_found", { code: "Required." });

    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon) return fail("We could not find that coupon code.", "not_found", { code: "Unknown code." });
    if (!coupon.active) return fail("This coupon is no longer active.", "inactive");
    if (coupon.expiresAt < new Date()) return fail("This coupon has expired.", "expired");
    if (coupon.maxRedemption && coupon.redemptions >= coupon.maxRedemption) {
      return fail("You have already used this coupon.", "maxed");
    }

    const value = Number(coupon.value);
    const amount =
      coupon.type === "bonus_flat" ? value : coupon.type === "fee_waiver" ? value : coupon.type === "cashback" ? 250 : 750;

    const reference = `BON-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const bonus = await prisma.$transaction(async (tx) => {
      const created = await tx.bonusAward.create({
        data: {
          reference,
          ownerId: user.id,
          title: coupon.title,
          description: `Redeemed with code ${coupon.code}.`,
          amount: round2(amount),
          status: "claimed",
          wallet: "bonus",
          source: `Coupon · ${coupon.code}`,
        },
      });
      await tx.coupon.update({ where: { id: coupon.id }, data: { redemptions: { increment: 1 } } });
      await tx.wallet.upsert({
        where: { userId_wallet: { userId: user.id, wallet: "bonus" } },
        update: { balance: { increment: round2(amount) } },
        create: { userId: user.id, wallet: "bonus", balance: round2(amount) },
      });
      return created;
    });

    const mapped = mapBonusAward(bonus);
    return ok({ bonus: mapped, message: `KES ${mapped.amount.toLocaleString()} added to your Bonus Wallet.` });
  } catch (error) {
    return serverError(error);
  }
}

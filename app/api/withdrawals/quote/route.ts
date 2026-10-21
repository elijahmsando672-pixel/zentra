import { prisma } from "@/lib/server/prisma";
import { fail, ok, readJson, serverError, unauthorized } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import {
  DAILY_WITHDRAWAL_LIMIT,
  MAX_WITHDRAWAL,
  MIN_WITHDRAWAL,
  WITHDRAWAL_FEE_FLAT,
  WITHDRAWAL_FEE_PERCENT,
} from "@/lib/constants";
import type { WalletType } from "@/lib/types";

const round2 = (n: number) => Number(n.toFixed(2));

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const body = await readJson(req);
    const amount = Number(body.amount);
    const wallet = body.wallet as WalletType;
    const payoutAccountId = String(body.payoutAccountId ?? "");

    if (amount < MIN_WITHDRAWAL) {
      return fail(`The minimum withdrawal is KES ${MIN_WITHDRAWAL.toLocaleString()}.`, "below_min", {
        amount: `Minimum KES ${MIN_WITHDRAWAL.toLocaleString()}.`,
      });
    }
    if (amount > MAX_WITHDRAWAL) {
      return fail(`The maximum withdrawal is KES ${MAX_WITHDRAWAL.toLocaleString()}.`, "above_max", {
        amount: `Maximum KES ${MAX_WITHDRAWAL.toLocaleString()}.`,
      });
    }

    const source = await prisma.wallet.findFirst({ where: { userId: user.id, wallet } });
    if (!source || source.locked) {
      return fail("This wallet cannot be used for withdrawals.", "wallet_locked");
    }
    if (Number(source.balance) < amount) {
      return fail("You do not have enough balance in this wallet.", "insufficient", {
        amount: "Insufficient balance.",
      });
    }
    const account = await prisma.payoutAccount.findFirst({
      where: { id: payoutAccountId, userId: user.id },
    });
    if (!account) return fail("Select a valid payout account.", "invalid_account");

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todays = await prisma.withdrawal.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: startOfDay },
        status: { notIn: ["rejected", "cancelled"] },
      },
    });
    const paidToday = todays.reduce((sum, w) => sum + Number(w.amount), 0);

    const fee = round2((amount * WITHDRAWAL_FEE_PERCENT) / 100 + WITHDRAWAL_FEE_FLAT);
    return ok({
      amount,
      fee,
      netAmount: round2(amount - fee),
      wallet,
      payoutAccountId,
      withinDailyLimit: paidToday + amount <= DAILY_WITHDRAWAL_LIMIT,
      remainingDailyLimit: Math.max(0, DAILY_WITHDRAWAL_LIMIT - paidToday),
    });
  } catch (error) {
    return serverError(error);
  }
}

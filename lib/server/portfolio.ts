import { prisma } from "@/lib/server/prisma";

const dayKey = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Record one honest portfolio snapshot per member per day.
 *
 * - `invested`  — principal still committed to active investments.
 * - `earnings`  — realised earnings credited to investments to date.
 * - `portfolio` — all wallet balances plus active invested principal.
 *
 * Snapshots are append-only history used for performance charts; they never
 * feed balances back into the system.
 */
export async function recordPortfolioSnapshot(userId: string, at = new Date()) {
  const date = dayKey(at);
  const nextDay = new Date(date.getTime() + 86_400_000);

  const existing = await prisma.portfolioPoint.findFirst({
    where: { userId, date: { gte: date, lt: nextDay } },
  });
  if (existing) return existing;

  const [wallets, investments] = await Promise.all([
    prisma.wallet.findMany({ where: { userId } }),
    prisma.investment.findMany({ where: { userId, status: { in: ["active", "maturing"] } } }),
  ]);
  const allInvestments = await prisma.investment.findMany({ where: { userId } });

  const walletTotal = wallets.reduce((sum, w) => sum + Number(w.balance), 0);
  const invested = investments.reduce((sum, i) => sum + Number(i.amount), 0);
  const realizedEarnings = allInvestments.reduce((sum, i) => sum + Number(i.earnedToDate), 0);
  const portfolio = Number((walletTotal + invested).toFixed(2));

  return prisma.portfolioPoint.create({
    data: {
      userId,
      date,
      portfolio,
      earnings: Number(realizedEarnings.toFixed(2)),
      invested: Number(invested.toFixed(2)),
    },
  });
}

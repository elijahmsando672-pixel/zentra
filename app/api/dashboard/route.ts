import { prisma } from "@/lib/server/prisma";
import { ok, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import { mapWallets } from "@/lib/server/mappers";
import { runDueJobs } from "@/lib/server/engine";
import { WALLET_META } from "@/lib/constants";

const round2 = (n: number) => Number(n.toFixed(2));

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    await runDueJobs(user.id);

    const [walletRows, investments, recent, points] = await Promise.all([
      prisma.wallet.findMany({ where: { userId: user.id } }),
      prisma.investment.findMany({ where: { userId: user.id } }),
      prisma.transaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.portfolioPoint.findMany({
        where: { userId: user.id },
        orderBy: { date: "asc" },
      }),
    ]);

    const wallets = mapWallets(walletRows);
    const activeInvestments = investments.filter(
      (i) => i.status === "active" || i.status === "maturing"
    );

    const totalInvested = wallets.balances.find((b) => b.wallet === "investment")?.balance ?? 0;
    const todayEarnings = activeInvestments.reduce((sum, i) => sum + Number(i.dailyEarning), 0);
    const totalEarnings =
      (wallets.balances.find((b) => b.wallet === "earnings")?.balance ?? 0) +
      investments.reduce((sum, i) => sum + Number(i.earnedToDate), 0) * 0.62;
    const teamRewardsTotal = wallets.balances.find((b) => b.wallet === "team_rewards")?.balance ?? 0;
    const pendingWithdrawal =
      wallets.balances.find((b) => b.wallet === "pending_withdrawal")?.balance ?? 0;

    let series = points.map((p) => ({
      date: p.date.toISOString(),
      portfolio: Number(p.portfolio),
      earnings: Number(p.earnings),
      invested: Number(p.invested),
    }));

    if (series.length === 0) {
      const value = wallets.totalBalance;
      series = Array.from({ length: 90 }, (_, i) => {
        const date = new Date(Date.now() - (89 - i) * 86_400_000);
        const wobble = Math.sin(i / 5) * 0.002;
        const portfolio = round2(value * (1 + wobble));
        return { date: date.toISOString(), portfolio, earnings: 0, invested: portfolio };
      });
    }

    const window30 = series.slice(-30);
    const a = window30[0]?.portfolio ?? 0;
    const b = window30[window30.length - 1]?.portfolio ?? 0;
    const growthPercent30d = a ? round2(((b - a) / a) * 100) : 0;

    return ok({
      user: {
        fullName: user.fullName,
        accountNumber: user.accountNumber,
        rank: user.rank,
        profileCompletion: user.profileCompletion,
        verificationStatus: user.verificationStatus,
      },
      totalAvailable: wallets.totalAvailable,
      totalInvested,
      todayEarnings: round2(todayEarnings),
      totalEarnings: round2(totalEarnings),
      teamRewardsTotal: round2(teamRewardsTotal),
      pendingWithdrawal,
      activeProducts: new Set(activeInvestments.map((i) => i.productId)).size,
      portfolioSeries: series.slice(-90),
      walletBreakdown: wallets.balances
        .filter((b) => !b.locked || b.wallet === "investment")
        .map((b) => ({
          wallet: b.wallet,
          label: b.label,
          balance: b.balance,
          hue: WALLET_META[b.wallet].hue,
        })),
      recentActivity: recent.map((t) => ({
        id: t.id,
        type: t.type,
        description: t.description,
        amount: Number(t.netAmount),
        direction: t.direction,
        status: t.status,
        at: t.createdAt.toISOString(),
      })),
      growthPercent30d,
    });
  } catch (error) {
    return serverError(error);
  }
}

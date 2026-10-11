"use client";

import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Coins,
  Package,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard, TrendIndicator } from "@/components/shared/stat-card";
import { CardSkeleton, ErrorState } from "@/components/shared/states";
import { MoneyDisplay } from "@/components/shared/money-display";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { InvestmentStatusBadge } from "@/components/shared/status-badge";
import { InvestmentProgressBar, TransactionRow } from "@/components/financial/financial";
import { PortfolioChart } from "@/components/charts/charts";
import { ProductIcon } from "@/components/products/product-components";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useApiQuery } from "@/hooks/use-api";
import { getDashboardSummary } from "@/lib/services/dashboard";
import { getInvestments } from "@/lib/services/investments";
import { getTransactions } from "@/lib/services/records";
import { getTeamSummary } from "@/lib/services/team";
import { getNotifications } from "@/lib/services/notifications";
import { NOTIFICATION_META, RANK_META } from "@/lib/constants";
import {
  formatCompactKES,
  formatDateTime,
  formatKES,
  greetingForDate,
  relativeTime,
} from "@/lib/utils";

const QUICK_ACTIONS = [
  { label: "Add funds", href: "/wallet/deposit", icon: ArrowDownLeft },
  { label: "Withdraw", href: "/wallet/withdraw", icon: ArrowUpRight },
  { label: "Invest", href: "/dashboard/products", icon: Package },
  { label: "Invite", href: "/team/referrals", icon: UserPlus },
];

export default function DashboardHomePage() {
  const summary = useApiQuery(["dashboard-summary"], getDashboardSummary);
  const investments = useApiQuery(["dashboard-active-investments"], () =>
    getInvestments({ status: "active" })
  );
  const transactions = useApiQuery(["dashboard-transactions"], () => getTransactions({ pageSize: 5 }));
  const team = useApiQuery(["dashboard-team"], getTeamSummary);
  const notifications = useApiQuery(["dashboard-notifications"], () => getNotifications());

  const user = summary.data?.user;
  const firstName = user?.fullName?.split(" ")[0] ?? "there";
  const portfolioValue = (summary.data?.totalInvested ?? 0) + (summary.data?.totalEarnings ?? 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greetingForDate()}, ${firstName}`}
        description={formatDateTime(new Date())}
        actions={<DemoDataBadge />}
      />

      {summary.isLoading ? (
        <CardSkeleton className="h-56" lines={5} />
      ) : summary.error ? (
        <ErrorState
          title="Could not load your summary"
          description={summary.error.message}
          onRetry={() => void summary.refetch()}
        />
      ) : summary.data ? (
        <div className="gradient-navy relative overflow-hidden rounded-lg border border-border p-6 text-white sm:p-8">
          <div className="grid-pattern absolute inset-0 opacity-40" aria-hidden />
          <div className="relative space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">
                  Total portfolio value
                </p>
                <MoneyDisplay amount={portfolioValue} size="hero" hideable className="text-white" />
                <div className="flex items-center gap-2">
                  <TrendIndicator value={summary.data.growthPercent30d} className="text-primary" />
                  <span className="text-xs text-white/60">over the last 30 days</span>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">
                    Available
                  </p>
                  <MoneyDisplay
                    amount={summary.data.totalAvailable}
                    size="lg"
                    hideable
                    className="text-primary"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">
                    Today&apos;s earnings
                  </p>
                  <MoneyDisplay amount={summary.data.todayEarnings} size="lg" className="text-white" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex items-center gap-3 rounded-lg border border-white/15 bg-white/5 p-3 transition-colors hover:bg-white/10"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/20 text-primary">
                    <action.icon className="size-4" />
                  </span>
                  <span className="text-sm font-bold">{action.label}</span>
                  <ArrowRight className="ml-auto size-3.5 text-white/40 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {summary.data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total invested"
            value={<MoneyDisplay amount={summary.data.totalInvested} decimals={0} />}
            icon={<TrendingUp className="size-5" />}
            supporting="Across active plans"
          />
          <StatCard
            label="Total earned"
            value={<MoneyDisplay amount={summary.data.totalEarnings} decimals={0} />}
            icon={<Coins className="size-5" />}
            trend={summary.data.growthPercent30d}
          />
          <StatCard
            label="Team rewards"
            value={<MoneyDisplay amount={summary.data.teamRewardsTotal} decimals={0} />}
            icon={<Users className="size-5" />}
            supporting="Claimed rewards"
          />
          <StatCard
            label="Active plans"
            value={summary.data.activeProducts}
            icon={<Package className="size-5" />}
            supporting={
              summary.data.pendingWithdrawal > 0
                ? `${formatCompactKES(summary.data.pendingWithdrawal)} pending withdrawal`
                : "No pending withdrawals"
            }
          />
        </div>
      )}

      {summary.data?.portfolioSeries?.length ? (
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-extrabold tracking-tight">Portfolio growth</h2>
                <p className="text-xs text-muted-foreground">
                  Invested capital vs total portfolio value
                </p>
              </div>
              <DemoDataBadge />
            </div>
            <PortfolioChart data={summary.data.portfolioSeries} />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section aria-labelledby="active-investments-heading" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 id="active-investments-heading" className="text-base font-extrabold tracking-tight">
                Active investments
              </h2>
              <Button asChild variant="ghost" size="sm">
                <Link href="/investments">
                  View all
                  <ArrowRight />
                </Link>
              </Button>
            </div>
            {investments.isLoading ? (
              <div className="space-y-3">
                <CardSkeleton lines={2} />
                <CardSkeleton lines={2} />
              </div>
            ) : investments.error ? (
              <ErrorState
                title="Could not load investments"
                description={investments.error.message}
                onRetry={() => void investments.refetch()}
              />
            ) : investments.data && investments.data.length > 0 ? (
              <div className="space-y-3">
                {investments.data.slice(0, 3).map((inv) => {
                  const percent =
                    inv.product.durationDays > 0
                      ? (inv.daysElapsed / inv.product.durationDays) * 100
                      : 0;
                  return (
                    <Card key={inv.id} className="transition-shadow hover:shadow-md">
                      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                        <ProductIcon icon={inv.product.icon} tier={inv.product.tier} />
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <Link
                                href={`/investments/${inv.id}`}
                                className="truncate text-sm font-extrabold hover:underline"
                              >
                                {inv.product.name}
                              </Link>
                              <InvestmentStatusBadge status={inv.status} />
                            </div>
                            <span className="numeric text-xs text-muted-foreground">{inv.reference}</span>
                          </div>
                          <InvestmentProgressBar
                            percent={percent}
                            daysElapsed={inv.daysElapsed}
                            daysTotal={inv.product.durationDays}
                            statusLabel={`${inv.daysRemaining} days remaining`}
                          />
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span>
                              Principal{" "}
                              <span className="numeric font-bold text-foreground">{formatKES(inv.amount, { decimals: 0 })}</span>
                            </span>
                            <span>
                              Daily{" "}
                              <span className="numeric font-bold text-success">{formatKES(inv.dailyEarning)}</span>
                            </span>
                          </div>
                        </div>
                        <Button asChild variant="outline" size="sm" className="shrink-0">
                          <Link href={`/investments/${inv.id}`}>Details</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-5 text-center text-sm text-muted-foreground">
                  No active investments yet.{" "}
                  <Link href="/dashboard/products" className="font-semibold text-foreground underline">
                    Browse products
                  </Link>{" "}
                  to get started.
                </CardContent>
              </Card>
            )}
          </section>

          <section aria-labelledby="recent-activity-heading" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 id="recent-activity-heading" className="text-base font-extrabold tracking-tight">
                Recent activity
              </h2>
              <Button asChild variant="ghost" size="sm">
                <Link href="/records">
                  View all
                  <ArrowRight />
                </Link>
              </Button>
            </div>
            {transactions.isLoading ? (
              <div className="space-y-3">
                <CardSkeleton lines={1} />
                <CardSkeleton lines={1} />
                <CardSkeleton lines={1} />
              </div>
            ) : transactions.error ? (
              <ErrorState
                title="Could not load activity"
                description={transactions.error.message}
                onRetry={() => void transactions.refetch()}
              />
            ) : transactions.data && transactions.data.items.length > 0 ? (
              <div className="space-y-3">
                {transactions.data.items.slice(0, 5).map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-5 text-center text-sm text-muted-foreground">
                  No recent activity to show.
                </CardContent>
              </Card>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section aria-labelledby="rank-heading">
            <Card>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <h2 id="rank-heading" className="text-sm font-extrabold uppercase tracking-wider">
                    Your rank
                  </h2>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/team">Team</Link>
                  </Button>
                </div>
                {team.isLoading ? (
                  <div className="space-y-3">
                    <div className="h-6 w-24 animate-pulse-soft rounded-md bg-muted" />
                    <div className="h-2 w-full animate-pulse-soft rounded-full bg-muted" />
                  </div>
                ) : team.error ? (
                  <ErrorState
                    title="Unavailable"
                    description={team.error.message}
                    onRetry={() => void team.refetch()}
                  />
                ) : team.data ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-sm font-extrabold">
                        {RANK_META[team.data.currentRank as keyof typeof RANK_META]?.label ??
                          team.data.currentRank}
                      </span>
                      {team.data.nextRank && (
                        <span className="text-xs text-muted-foreground">
                          Next:{" "}
                          <span className="font-bold text-foreground">
                            {RANK_META[team.data.nextRank]?.label ?? team.data.nextRank}
                          </span>
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Progress value={team.data.rankProgress} indicatorClassName="bg-primary" />
                      <p className="numeric text-xs text-muted-foreground">
                        {team.data.rankProgress}% to next rank
                      </p>
                    </div>
                    <Separator />
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Team size
                        </dt>
                        <dd className="numeric mt-0.5 font-extrabold">{team.data.totalMembers}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Direct referrals
                        </dt>
                        <dd className="numeric mt-0.5 font-extrabold">{team.data.directReferrals}</dd>
                      </div>
                    </dl>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </section>

          <section aria-labelledby="notifications-heading" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 id="notifications-heading" className="text-base font-extrabold tracking-tight">
                Notifications
              </h2>
              <Button asChild variant="ghost" size="sm">
                <Link href="/notifications">
                  View all
                  <ArrowRight />
                </Link>
              </Button>
            </div>
            {notifications.isLoading ? (
              <CardSkeleton lines={3} />
            ) : notifications.error ? (
              <ErrorState
                title="Unavailable"
                description={notifications.error.message}
                onRetry={() => void notifications.refetch()}
              />
            ) : notifications.data && notifications.data.length > 0 ? (
              <Card>
                <CardContent className="divide-y divide-border p-0">
                  {notifications.data.slice(0, 3).map((n) => {
                    const meta = NOTIFICATION_META[n.category];
                    const Icon = meta.icon;
                    return (
                      <Link
                        key={n.id}
                        href={n.actionHref ?? "/notifications"}
                        className="flex items-start gap-3 p-4 transition-colors hover:bg-muted/40"
                      >
                        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground">
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-bold">{n.title}</span>
                            {!n.read && <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                          </span>
                          <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground leading-relaxed">
                            {n.body}
                          </span>
                          <span className="mt-1 block text-[11px] text-muted-foreground">
                            {relativeTime(n.at)}
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
                  <Bell className="size-4" />
                  You are all caught up.
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

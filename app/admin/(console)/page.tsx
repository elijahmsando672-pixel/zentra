"use client";

import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  History,
  MessageSquare,
  Package,
  Scale,
  ShieldAlert,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { SimpleLineChart } from "@/components/charts/charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useApiQuery } from "@/hooks/use-api";
import { getAdminDashboard, getAuditLogs } from "@/lib/services/admin";
import { formatCompactKES, formatDateTime, formatKES, relativeTime, titleCase } from "@/lib/utils";
import type { AdminDashboardSummary } from "@/lib/types";

type DashboardExtras = {
  txSeries: {
    date: string;
    deposits: number;
    withdrawals: number;
    investments: number;
    newUsers: number;
  }[];
};

const QUICK_ACTIONS = [
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Deposits", href: "/admin/deposits", icon: ArrowDownLeft },
  { label: "Withdrawals", href: "/admin/withdrawals", icon: ArrowUpRight },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Investments", href: "/admin/investments", icon: TrendingUp },
  { label: "Risk center", href: "/admin/risk", icon: ShieldAlert },
  { label: "Support", href: "/admin/support", icon: MessageSquare },
  { label: "Audit logs", href: "/admin/audit-logs", icon: History },
];

export default function AdminOverviewPage() {
  const dashboard = useApiQuery(["admin", "overview", "summary"], getAdminDashboard, {
    refetchInterval: 60_000,
  });
  const audit = useApiQuery(["admin", "overview", "audit"], () => getAuditLogs({ page: 1 }));

  const data = dashboard.data as (AdminDashboardSummary & DashboardExtras) | undefined;
  const extras = data;
  const series7 = (extras?.txSeries ?? []).slice(-7);

  const attention = data
    ? [
        { label: "Pending deposits", count: data.pendingDeposits, href: "/admin/deposits", icon: ArrowDownLeft, tone: "text-warning" },
        { label: "Pending withdrawals", count: data.pendingWithdrawals, href: "/admin/withdrawals", icon: ArrowUpRight, tone: "text-warning" },
        { label: "Failed or rejected withdrawals", count: data.failedWithdrawals, href: "/admin/withdrawals", icon: ShieldAlert, tone: "text-danger" },
        { label: "Open support tickets", count: data.openTickets, href: "/admin/support", icon: MessageSquare, tone: "text-info" },
        { label: "High-risk accounts", count: data.highRiskAccounts, href: "/admin/risk", icon: ShieldAlert, tone: "text-danger" },
        { label: "Reconciliation mismatches", count: data.reconciliationMismatches, href: "/admin/reconciliation", icon: Scale, tone: "text-danger" },
      ]
    : [];

  const needsAttention = attention.filter((a) => a.count > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations overview"
        description="Live posture of the Zentra platform: queues, risk, and platform activity."
        actions={<DemoDataBadge />}
      />

      {dashboard.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} className="h-[124px]" lines={2} />
          ))}
        </div>
      ) : dashboard.error ? (
        <ErrorState
          title="Could not load the operations summary"
          description={dashboard.error.message}
          onRetry={() => void dashboard.refetch()}
        />
      ) : data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total users"
            value={data.totalUsers.toLocaleString()}
            icon={<Users className="size-5" />}
            supporting={`${data.newUsersToday} joined today`}
          />
          <StatCard
            label="Deposit volume"
            value={formatCompactKES(data.totalDeposits)}
            icon={<ArrowDownLeft className="size-5" />}
            supporting={`${formatCompactKES(data.depositsToday)} today`}
          />
          <StatCard
            label="Pending deposits"
            value={data.pendingDeposits.toLocaleString()}
            icon={<ArrowDownLeft className="size-5" />}
            supporting="Awaiting review"
          />
          <StatCard
            label="Pending withdrawals"
            value={data.pendingWithdrawals.toLocaleString()}
            icon={<ArrowUpRight className="size-5" />}
            supporting="Dual approval queue"
          />
          <StatCard
            label="Active investments"
            value={data.activeInvestments.toLocaleString()}
            icon={<TrendingUp className="size-5" />}
            supporting={`${formatCompactKES(data.dailyEarningsCredited)} credited daily`}
          />
          <StatCard
            label="Team rewards issued"
            value={formatCompactKES(data.teamRewardsIssued)}
            icon={<Users className="size-5" />}
            supporting="Claimed to date"
          />
          <StatCard
            label="Open tickets"
            value={data.openTickets.toLocaleString()}
            icon={<MessageSquare className="size-5" />}
            supporting="Unresolved conversations"
          />
          <StatCard
            label="High-risk accounts"
            value={data.highRiskAccounts.toLocaleString()}
            icon={<ShieldAlert className="size-5" />}
            supporting={`${data.verifiedUsers} of ${data.totalUsers} verified`}
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-extrabold tracking-tight">7-day money movement</h2>
                <p className="text-xs text-muted-foreground">
                  Rolling deposit and withdrawal totals from the operations feed
                </p>
              </div>
              <DemoDataBadge />
            </div>
            {dashboard.isLoading ? (
              <div className="space-y-4">
                <CardSkeleton lines={2} className="h-40" />
                <CardSkeleton lines={2} className="h-40" />
              </div>
            ) : series7.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Deposits
                  </p>
                  <SimpleLineChart
                    data={series7.map((d) => ({ label: d.date, value: d.deposits }))}
                    color="#18b97a"
                    height={200}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Withdrawals
                  </p>
                  <SimpleLineChart
                    data={series7.map((d) => ({ label: d.date, value: d.withdrawals }))}
                    color="#f59e0b"
                    height={200}
                  />
                </div>
              </div>
            ) : (
              <EmptyState title="No activity series available" description="The operations feed did not return any data points." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold uppercase tracking-wider">Needs attention</h2>
              <Badge variant="secondary">{needsAttention.length}</Badge>
            </div>
            {dashboard.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse-soft rounded-md bg-muted" />
                ))}
              </div>
            ) : needsAttention.length > 0 ? (
              <ul className="divide-y divide-border">
                {needsAttention.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="group flex items-center gap-3 py-3 transition-colors hover:text-primary"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary">
                        <item.icon className={`size-4 ${item.tone}`} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-bold">{item.label}</span>
                      <span className="numeric text-sm font-extrabold">{item.count}</span>
                      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-card/60 px-4 py-8 text-center">
                <p className="text-sm font-bold text-success">All queues are clear</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  No pending items require action right now.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-extrabold tracking-tight">Recent audit trail</h2>
                <p className="text-xs text-muted-foreground">Latest staff actions across the console</p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/audit-logs">
                  View all
                  <ArrowRight />
                </Link>
              </Button>
            </div>
            {audit.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-9 animate-pulse-soft rounded-md bg-muted" style={{ width: `${92 - i * 6}%` }} />
                ))}
              </div>
            ) : audit.error ? (
              <ErrorState
                title="Could not load audit logs"
                description={audit.error.message}
                onRetry={() => void audit.refetch()}
              />
            ) : audit.data && audit.data.items.length > 0 ? (
              <ul className="divide-y divide-border">
                {audit.data.items.slice(0, 5).map((log) => (
                  <li key={log.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-bold">{log.actor}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {titleCase(log.action)}
                        </Badge>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {log.entityType} · <span className="numeric">{log.entityId}</span>
                        {log.reason ? ` — ${log.reason}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{relativeTime(log.at)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No audit activity yet" description="Staff actions will appear here as they happen." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider">Quick actions</h2>
              <p className="mt-1 text-xs text-muted-foreground">Jump straight into a console queue.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_ACTIONS.map((action) => (
                <Button key={action.href} asChild variant="outline" size="sm">
                  <Link href={action.href}>
                    <action.icon className="size-4" />
                    {action.label}
                  </Link>
                </Button>
              ))}
            </div>
            {data && (
              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Snapshot
                </p>
                <p className="numeric mt-2 text-sm">
                  <span className="font-extrabold">{data.activeUsers.toLocaleString()}</span>
                  <span className="text-muted-foreground"> active users · </span>
                  <span className="font-extrabold">{formatKES(data.totalWithdrawals, { decimals: 0 })}</span>
                  <span className="text-muted-foreground"> paid out</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Updated {formatDateTime(new Date())}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  FileBarChart,
  Landmark,
  MessageSquare,
  Network,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { CardSkeleton, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleLineChart, EarningsBarChart } from "@/components/charts/charts";
import { StatementDownloadDialog } from "@/components/financial/financial";
import { useApiQuery } from "@/hooks/use-api";
import {
  getAdminDashboard,
  getAdminDeposits,
  getAdminWithdrawals,
  getLedger,
} from "@/lib/services/admin";
import { getAdminSupportTickets as getSupportTickets } from "@/lib/services/support";
import { getAdminTeamRewards as getTeamRewards } from "@/lib/services/admin";
import {
  cn,
  downloadTextFile,
  formatDateTime,
  formatKES,
  formatShortDate,
  toCSV,
} from "@/lib/utils";
import type { Deposit, LedgerJournal, TeamReward, Withdrawal } from "@/lib/types";

function ReportFigure({ label, value, loading }: { label: string; value: React.ReactNode; loading?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      {loading ? (
        <div className="h-5 w-20 animate-pulse-soft rounded-md bg-muted" />
      ) : (
        <p className="numeric truncate text-lg font-extrabold tracking-tight">{value}</p>
      )}
    </div>
  );
}

function ReportCard({
  title,
  description,
  icon,
  loading,
  error,
  figures,
  footer,
  onDownload,
  downloadLabel = "Download CSV",
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  figures: { label: string; value: React.ReactNode }[];
  footer?: React.ReactNode;
  onDownload?: () => void;
  downloadLabel?: string;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <span className="text-muted-foreground">{icon}</span>
              {title}
            </CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : (
          <div className={cn("grid gap-4", figures.length > 3 ? "grid-cols-2" : "grid-cols-1")}>
            {figures.map((f) => (
              <ReportFigure key={f.label} label={f.label} value={f.value} loading={loading} />
            ))}
          </div>
        )}
        {footer && <div className="border-t border-border pt-3 text-xs text-muted-foreground">{footer}</div>}
        <div className="mt-auto">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onDownload}
            disabled={loading}
          >
            <Download />
            {downloadLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminReportsPage() {
  const dashboard = useApiQuery(["admin", "reports-dashboard"], getAdminDashboard);
  const deposits = useApiQuery(["admin", "reports-deposits"], () =>
    getAdminDeposits({ page: 1, pageSize: 200 })
  );
  const withdrawals = useApiQuery(["admin", "reports-withdrawals"], () => getAdminWithdrawals({ page: 1 }));
  const teamRewards = useApiQuery(["admin", "reports-team"], () => getTeamRewards());
  const ledger = useApiQuery(["admin", "reports-ledger"], () => getLedger({ page: 1 }));
  const tickets = useApiQuery(["admin", "reports-tickets"], getSupportTickets);

  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");

  const inRange = React.useCallback(
    (iso: string) => {
      const t = +new Date(iso);
      if (from && t < +new Date(`${from}T00:00:00`)) return false;
      if (to && t > +new Date(`${to}T23:59:59`)) return false;
      return true;
    },
    [from, to]
  );

  const rangeNote =
    from || to ? `Filtered ${from || "start"} → ${to || "now"}` : "All time (no range filter)";

  const depositList = React.useMemo(
    () => (deposits.data?.items ?? []).filter((d) => inRange(d.createdAt)),
    [deposits.data, inRange]
  );
  const withdrawalList = React.useMemo(
    () => (withdrawals.data?.items ?? []).filter((w) => inRange(w.createdAt)),
    [withdrawals.data, inRange]
  );
  const teamList = React.useMemo(
    () => (teamRewards.data ?? []).filter((r) => inRange(r.createdAt)),
    [teamRewards.data, inRange]
  );
  const ledgerList = React.useMemo(
    () => (ledger.data?.items ?? []).filter((l) => inRange(l.createdAt)),
    [ledger.data, inRange]
  );
  const ticketList = React.useMemo(
    () => (tickets.data ?? []).filter((t) => inRange(t.createdAt)),
    [tickets.data, inRange]
  );

  const summary = React.useMemo(() => {
    const depositTotal = depositList
      .filter((d) => d.status === "completed")
      .reduce((s, d) => s + d.amount, 0);
    const depositPending = depositList.filter((d) => d.status === "pending" || d.status === "initiated").length;
    const withdrawalPaid = withdrawalList.filter((w) => w.status === "paid").reduce((s, w) => s + w.amount, 0);
    const withdrawalPending = withdrawalList.filter((w) => w.status === "pending_approval").length;
    const teamClaimed = teamList.filter((r) => r.status === "claimed").reduce((s, r) => s + r.amount, 0);
    const teamPending = teamList.filter((r) => r.status === "pending").length;
    const ledgerSum = ledgerList.reduce((s, l) => s + l.totalAmount, 0);
    const openTickets = ticketList.filter((t) => t.status !== "resolved" && t.status !== "closed").length;
    const avgDeposit = depositList.length > 0 ? depositTotal / Math.max(depositList.filter((d) => d.status === "completed").length, 1) : 0;
    const avgWithdrawal = withdrawalList.length > 0 ? withdrawalPaid / Math.max(withdrawalList.filter((w) => w.status === "paid").length, 1) : 0;
    return {
      depositTotal,
      depositPending,
      withdrawalPaid,
      withdrawalPending,
      teamClaimed,
      teamPending,
      ledgerSum,
      openTickets,
      avgDeposit,
      avgWithdrawal,
    };
  }, [depositList, withdrawalList, teamList, ledgerList, ticketList]);

  const chartData = React.useMemo(() => {
    const series = (dashboard.data?.txSeries ?? []) as {
      date: string;
      deposits: number;
      withdrawals: number;
    }[];
    return series.slice(-14).map((d) => ({
      date: d.date,
      label: formatShortDate(d.date),
      deposits: d.deposits,
      withdrawals: d.withdrawals,
    }));
  }, [dashboard.data]);

  const download = (filename: string, rows: Record<string, unknown>[]) => {
    downloadTextFile(filename, toCSV(rows));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Client-side summaries across users, movement, team and support — simulated figures only."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Reports" }]}
        actions={<DemoDataBadge />}
      />

      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="report-from">From</Label>
              <Input id="report-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-to">To</Label>
              <Input id="report-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Data as of {formatDateTime(new Date())}</p>
            <p className="mt-1">{rangeNote}. The reports below are calculated from records returned by the service.</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ReportCard
          title="Users"
          description="Registration and verification snapshot."
          icon={<Users />}
          loading={dashboard.isLoading}
          error={dashboard.error?.message}
          figures={[
            { label: "Total registered", value: dashboard.data?.totalUsers ?? 0 },
            { label: "New today", value: dashboard.data?.newUsersToday ?? 0 },
            { label: "Verified", value: dashboard.data?.verifiedUsers ?? 0 },
            { label: "Active", value: dashboard.data?.activeUsers ?? 0 },
          ]}
          onDownload={() =>
            download("zentra-users-summary.csv", [
              {
                metric: "total",
                value: dashboard.data?.totalUsers ?? 0,
              },
              {
                metric: "new_today",
                value: dashboard.data?.newUsersToday ?? 0,
              },
              {
                metric: "verified",
                value: dashboard.data?.verifiedUsers ?? 0,
              },
              {
                metric: "active",
                value: dashboard.data?.activeUsers ?? 0,
              },
            ])
          }
        />

        <ReportCard
          title="Deposits"
          description="M-Pesa deposit volume within range."
          icon={<ArrowDownLeft />}
          loading={deposits.isLoading}
          error={deposits.error?.message}
          figures={[
            { label: "Requests", value: depositList.length },
            { label: "Completed total", value: formatKES(summary.depositTotal) },
            { label: "Pending", value: summary.depositPending },
            { label: "Avg completed", value: formatKES(summary.avgDeposit) },
          ]}
          footer={`Source: latest ${deposits.data?.items.length ?? 0} deposit records.`}
          onDownload={() =>
            download(
              "zentra-deposits.csv",
              depositList.map((d: Deposit) => ({
                Reference: d.reference,
                Amount: d.amount,
                Status: d.status,
                Phone: d.phone,
                Date: new Date(d.createdAt).toISOString(),
              }))
            )
          }
        />

        <ReportCard
          title="Withdrawals"
          description="Payout queue summary within range."
          icon={<ArrowUpRight />}
          loading={withdrawals.isLoading}
          error={withdrawals.error?.message}
          figures={[
            { label: "In page", value: withdrawalList.length },
            { label: "Paid total", value: formatKES(summary.withdrawalPaid) },
            { label: "Pending", value: summary.withdrawalPending },
            { label: "Avg paid", value: formatKES(summary.avgWithdrawal) },
          ]}
          footer={`Total withdrawals on record: ${withdrawals.data?.total ?? 0}. Page caps at 10 records.`}
          onDownload={() =>
            download(
              "zentra-withdrawals.csv",
              withdrawalList.map((w: Withdrawal) => ({
                Reference: w.reference,
                Amount: w.amount,
                Status: w.status,
                Payout: w.payoutAccount.nickname,
                Date: new Date(w.createdAt).toISOString(),
              }))
            )
          }
        />

        <ReportCard
          title="Team commissions"
          description="Three-level referral rewards issued."
          icon={<Network />}
          loading={teamRewards.isLoading}
          error={teamRewards.error?.message}
          figures={[
            { label: "Rewards", value: teamList.length },
            { label: "Claimed", value: formatKES(summary.teamClaimed) },
            { label: "Pending", value: summary.teamPending },
            { label: "Avg rate", value: teamList.length ? `${(teamList.reduce((s, r) => s + r.commissionRate, 0) / teamList.length).toFixed(1)}%` : "—" },
          ]}
          onDownload={() =>
            download(
              "zentra-team-rewards.csv",
              teamList.map((r: TeamReward) => ({
                Reference: r.reference,
                Member: r.sourceMember,
                Level: r.level,
                Amount: r.amount,
                Rate: r.commissionRate,
                Status: r.status,
                Date: new Date(r.createdAt).toISOString(),
              }))
            )
          }
        />

        <ReportCard
          title="Ledger movement"
          description="Journal activity recorded in the ledger."
          icon={<Landmark />}
          loading={ledger.isLoading}
          error={ledger.error?.message}
          figures={[
            { label: "Journals", value: ledger.data?.total ?? 0 },
            { label: "In page sum", value: formatKES(summary.ledgerSum) },
            { label: "Debits", value: ledgerList.flatMap((l) => l.entries).filter((e) => e.direction === "debit").length },
            { label: "Credits", value: ledgerList.flatMap((l) => l.entries).filter((e) => e.direction === "credit").length },
          ]}
          footer={`Page sums shown for the latest ${ledgerList.length} journals.`}
          onDownload={() =>
            download(
              "zentra-ledger.csv",
              ledgerList.map((l: LedgerJournal) => ({
                Reference: l.reference,
                Type: l.type,
                Amount: l.totalAmount,
                Actor: l.actor,
                Date: new Date(l.createdAt).toISOString(),
              }))
            )
          }
        />

        <ReportCard
          title="Tickets"
          description="Support queue composition within range."
          icon={<MessageSquare />}
          loading={tickets.isLoading}
          error={tickets.error?.message}
          figures={[
            { label: "Total", value: ticketList.length },
            { label: "Open", value: summary.openTickets },
            { label: "Waiting", value: ticketList.filter((t) => t.status === "waiting_on_you").length },
            { label: "Resolved", value: ticketList.filter((t) => t.status === "resolved").length },
          ]}
          onDownload={() =>
            download(
              "zentra-tickets.csv",
              ticketList.map((t) => ({
                Reference: t.reference,
                Subject: t.subject,
                Status: t.status,
                Priority: t.priority,
                Category: t.category,
                Date: new Date(t.createdAt).toISOString(),
              }))
            )
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Deposit volume — 14 days</CardTitle>
            <CardDescription>Simulated daily deposit totals.</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length ? (
              <SimpleLineChart data={chartData.map((d) => ({ label: d.label, value: d.deposits }))} height={230} />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">No series available.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Withdrawal volume — 14 days</CardTitle>
            <CardDescription>Simulated daily payout totals.</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length ? (
              <EarningsBarChart data={chartData.map((d) => ({ label: d.label, value: d.withdrawals }))} height={230} />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">No series available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-bold">
              <FileBarChart className="size-4 text-muted-foreground" />
              Statement export
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Generates a ledger-based CSV statement locally — nothing leaves the browser.
            </p>
          </div>
          <StatementDownloadDialog
            onDownload={() => {
              download(
                "zentra-ledger-statement.csv",
                ledgerList.map((l) => ({
                  Reference: l.reference,
                  Type: l.type,
                  Description: l.description,
                  Amount: l.totalAmount,
                  Date: new Date(l.createdAt).toISOString(),
                }))
              );
            }}
          />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Some summaries may include sample records. Compare report totals with transaction and provider records before acting.
      </p>
    </div>
  );
}

"use client";

import * as React from "react";
import { Download, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { useApiQuery } from "@/hooks/use-api";
import { getTeamRewards } from "@/lib/services/team";
import { downloadTextFile, formatDateTime, formatKES, formatShortDate, titleCase, toCSV } from "@/lib/utils";
import { toast } from "sonner";
import type { RewardStatus, TeamReward } from "@/lib/types";

const REWARD_STATUS_META: Record<RewardStatus, { label: string; tone: string }> = {
  available: { label: "Available", tone: "success" },
  claimed: { label: "Claimed", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  expired: { label: "Expired", tone: "neutral" },
  reversed: { label: "Reversed", tone: "danger" },
};

const LEVEL_OPTIONS = [
  { value: "all", label: "All levels" },
  { value: "1", label: "Level 1" },
  { value: "2", label: "Level 2" },
  { value: "3", label: "Level 3" },
] as const;

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "available", label: "Available" },
  { value: "claimed", label: "Claimed" },
  { value: "pending", label: "Pending" },
  { value: "expired", label: "Expired" },
  { value: "reversed", label: "Reversed" },
] as const;

const PAGE_SIZE = 8;

export default function TeamRewardsPage() {
  const [level, setLevel] = React.useState<string>("all");
  const [status, setStatus] = React.useState<string>("all");
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<TeamReward | null>(null);

  const all = useApiQuery<TeamReward[]>(["team", "rewards", "all"], () => getTeamRewards());
  const filtered = useApiQuery<TeamReward[]>(["team", "rewards", level, status], () =>
    getTeamRewards({
      level: level === "all" ? undefined : (Number(level) as 1 | 2 | 3),
      status,
    })
  );

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return (filtered.data ?? []).filter(
      (r) =>
        !q ||
        r.reference.toLowerCase().includes(q) ||
        r.sourceMember.toLowerCase().includes(q) ||
        r.sourceType.includes(q)
    );
  }, [filtered.data, query]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const stats = all.data;
  const now = new Date();
  const totalCommissions = (stats ?? []).reduce((sum, r) => sum + r.amount, 0);
  const thisMonth = (stats ?? [])
    .filter((r) => {
      const d = new Date(r.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, r) => sum + r.amount, 0);
  const levelSum = (lvl: 1 | 2 | 3) =>
    (stats ?? []).filter((r) => r.level === lvl).reduce((sum, r) => sum + r.amount, 0);

  const changeLevel = (value: string) => {
    setLevel(value);
    setPage(1);
  };
  const changeStatus = (value: string) => {
    setStatus(value);
    setPage(1);
  };
  const changeQuery = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const exportCsv = () => {
    if (rows.length === 0) {
      toast.error("Nothing to export with these filters.");
      return;
    }
    const csvRows = rows.map((r) => ({
      reference: r.reference,
      member: r.sourceMember,
      level: r.level,
      sourceType: r.sourceType,
      commissionRatePercent: r.commissionRate,
      amount: r.amount,
      status: r.status,
      createdAt: r.createdAt,
    }));
    downloadTextFile(`zentra-team-rewards-${Date.now()}.csv`, toCSV(csvRows));
    toast.success("CSV export downloaded");
  };

  const columns: DataTableColumn<TeamReward>[] = [
    {
      key: "reference",
      header: "Reference",
      primary: true,
      render: (r) => (
        <div>
          <p className="numeric text-xs font-bold">{r.reference}</p>
          <p className="text-[11px] text-muted-foreground">{formatShortDate(r.createdAt)}</p>
        </div>
      ),
    },
    {
      key: "member",
      header: "Member",
      secondary: true,
      render: (r) => <span className="text-sm font-semibold">{r.sourceMember}</span>,
    },
    {
      key: "level",
      header: "Level",
      render: (r) => <Badge variant="outline">L{r.level}</Badge>,
    },
    {
      key: "type",
      header: "Source",
      hideOnMobile: true,
      render: (r) => <Badge variant="secondary">{titleCase(r.sourceType)}</Badge>,
    },
    {
      key: "rate",
      header: "Rate",
      hideOnMobile: true,
      render: (r) => <span className="numeric text-xs font-bold text-success">{r.commissionRate}%</span>,
    },
    {
      key: "amount",
      header: "Amount",
      className: "text-right",
      headerClassName: "text-right",
      render: (r) => <span className="numeric font-extrabold">{formatKES(r.amount, { decimals: 0 })}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={r.status} meta={REWARD_STATUS_META[r.status]} />,
    },
    {
      key: "date",
      header: "Date",
      hideOnMobile: true,
      render: (r) => <span className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Team rewards"
        description="Every commission earned across your three levels, with references you can reconcile."
        breadcrumbs={[{ label: "Team", href: "/team" }, { label: "Rewards" }]}
        actions={
          <>
            <DemoDataBadge />
            <Button variant="outline" onClick={exportCsv}>
              <Download /> Export CSV
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total commissions"
          value={stats ? formatKES(totalCommissions, { decimals: 0 }) : "KES 0"}
          icon={<Gift className="size-5" />}
          loading={all.isPending}
          supporting={stats ? `${stats.length} reward entries` : undefined}
        />
        <StatCard
          label="Earned this month"
          value={stats ? formatKES(thisMonth, { decimals: 0 }) : "KES 0"}
          icon={<Gift className="size-5" />}
          loading={all.isPending}
          supporting="Current calendar month"
        />
        <StatCard label="Level 1 commissions" value={stats ? formatKES(levelSum(1), { decimals: 0 }) : "KES 0"} icon={<Gift className="size-5" />} loading={all.isPending} supporting="Direct referrals" />
        <StatCard label="Level 2 commissions" value={stats ? formatKES(levelSum(2), { decimals: 0 }) : "KES 0"} icon={<Gift className="size-5" />} loading={all.isPending} supporting="Second tier" />
        <StatCard label="Level 3 commissions" value={stats ? formatKES(levelSum(3), { decimals: 0 }) : "KES 0"} icon={<Gift className="size-5" />} loading={all.isPending} supporting="Third tier" />
      </div>

      {all.isError && (
        <ErrorState title="Could not load rewards" description={all.error?.message} onRetry={() => void all.refetch()} />
      )}

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid gap-3 sm:grid-cols-2 lg:w-[420px]">
              <Select value={level} onValueChange={changeLevel}>
                <SelectTrigger aria-label="Filter by level">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  {LEVEL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={changeStatus}>
                <SelectTrigger aria-label="Filter by status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <SearchInput value={query} onChange={changeQuery} placeholder="Search reference or member…" className="lg:max-w-72" />
          </div>

          {filtered.isPending && <TableSkeleton rows={6} cols={6} />}

          {filtered.isError && (
            <ErrorState
              title="Could not load rewards"
              description={filtered.error?.message}
              onRetry={() => void filtered.refetch()}
            />
          )}

          {filtered.data && (
            <>
              <DataTable
                columns={columns}
                rows={paged}
                keyExtractor={(r) => r.id}
                onRowClick={(r) => setSelected(r)}
                emptyState={
                  <EmptyState
                    title="No rewards found"
                    description={
                      query || level !== "all" || status !== "all"
                        ? "No commissions match these filters. Adjust them to see more entries."
                        : "Commissions from your team's volume will appear here once activity starts."
                    }
                  />
                }
              />

              {rows.length > 0 && (
                <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row">
                  <p className="text-xs text-muted-foreground">
                    Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, rows.length)} of {rows.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safePage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <span className="numeric text-xs font-bold">
                      Page {safePage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safePage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>Reward details</DialogTitle>
                <DialogDescription className="numeric">{selected.reference}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="numeric text-xl font-extrabold">{formatKES(selected.amount)}</span>
                </div>
                <Separator />
                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Member</dt>
                    <dd className="font-semibold">{selected.sourceMember}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Level</dt>
                    <dd>
                      <Badge variant="outline">L{selected.level}</Badge>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Source</dt>
                    <dd>
                      <Badge variant="secondary">{titleCase(selected.sourceType)}</Badge>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Commission rate</dt>
                    <dd className="numeric font-bold text-success">{selected.commissionRate}%</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd>
                      <StatusBadge status={selected.status} meta={REWARD_STATUS_META[selected.status]} />
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Created</dt>
                    <dd className="numeric">{formatDateTime(selected.createdAt)}</dd>
                  </div>
                  {selected.reversedReason && (
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-muted-foreground">Reversal reason</dt>
                      <dd className="text-right text-xs font-semibold text-danger">{selected.reversedReason}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

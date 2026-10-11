"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Coins,
  Percent,
  Scale,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { CopyButton } from "@/components/shared/copy-button";
import { SearchInput } from "@/components/shared/search-input";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import {
  CardSkeleton,
  EmptyState,
  ErrorState,
  TableSkeleton,
} from "@/components/shared/states";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApiQuery } from "@/hooks/use-api";
import { getAdminCommissionRules as getCommissionRules, getAdminTeamRewards as getTeamRewards, getAdminDashboard, updateCommissionRule } from "@/lib/services/admin";
import { toast } from "sonner";
import { RANK_META } from "@/lib/constants";
import { cn, formatCompactKES, formatDateTime, formatKES, formatPercent } from "@/lib/utils";
import type { CommissionRule, TeamReward } from "@/lib/types";

const REWARD_STATUS_META: Record<string, { label: string; tone: string }> = {
  claimed: { label: "Claimed", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  reversed: { label: "Reversed", tone: "danger" },
  available: { label: "Available", tone: "info" },
  expired: { label: "Expired", tone: "neutral" },
};

const SOURCE_LABEL: Record<string, string> = {
  investment: "Investment",
  deposit: "Deposit",
  campaign: "Campaign",
};

const PAGE_SIZE = 8;

export default function CommissionsPage() {
  const dashboard = useApiQuery(["admin", "commissions", "dashboard"], getAdminDashboard);
  const rules = useApiQuery(["admin", "commissions", "rules"], getCommissionRules);
  const rewards = useApiQuery(["admin", "commissions", "rewards"], () => getTeamRewards());

  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [levelFilter, statusFilter, search]);

  const rewardsList = useMemo(() => rewards.data ?? [], [rewards.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rewardsList.filter((reward) => {
      if (levelFilter !== "all" && reward.level !== Number(levelFilter)) return false;
      if (statusFilter !== "all" && reward.status !== statusFilter) return false;
      if (q && !reward.reference.toLowerCase().includes(q) && !reward.sourceMember.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [rewardsList, levelFilter, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const rewardsThisMonth = useMemo(() => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return rewardsList
      .filter((r) => r.status === "claimed" && new Date(r.createdAt).getTime() >= first)
      .reduce((s, r) => s + r.amount, 0);
  }, [rewardsList]);

  const activeRules = useMemo(
    () => (rules.data ?? []).filter((r) => r.active).length,
    [rules.data]
  );

  const columns: DataTableColumn<TeamReward>[] = [
    {
      key: "reference",
      header: "Reference",
      primary: true,
      render: (reward) => (
        <span className="numeric inline-flex items-center gap-1 font-bold">
          {reward.reference}
          <CopyButton value={reward.reference} label={`Copy ${reward.reference}`} size="icon-sm" />
        </span>
      ),
    },
    {
      key: "sourceMember",
      header: "Member",
      secondary: true,
      render: (reward) => <span className="font-semibold">{reward.sourceMember}</span>,
    },
    {
      key: "level",
      header: "Level",
      render: (reward) => (
        <Badge variant="secondary" className="numeric">
          L{reward.level}
        </Badge>
      ),
    },
    {
      key: "sourceType",
      header: "Source",
      hideOnMobile: true,
      render: (reward) => (
        <span className="text-muted-foreground">{SOURCE_LABEL[reward.sourceType] ?? reward.sourceType}</span>
      ),
    },
    {
      key: "volume",
      header: "Volume (est.)",
      hideOnMobile: true,
      render: (reward) => (
        <span className="numeric text-muted-foreground">
          {reward.commissionRate > 0
            ? formatCompactKES((reward.amount / reward.commissionRate) * 100)
            : "—"}
        </span>
      ),
    },
    {
      key: "rate",
      header: "Rate",
      render: (reward) => (
        <span className="numeric font-semibold text-info">{formatPercent(reward.commissionRate, 1)}</span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      render: (reward) => (
        <span className="numeric block text-right font-extrabold text-success">
          {formatKES(reward.amount)}
        </span>
      ),
      className: "text-right",
    },
    {
      key: "status",
      header: "Status",
      render: (reward) => (
        <StatusBadge
          status={reward.status}
          meta={REWARD_STATUS_META[reward.status] ?? { label: reward.status, tone: "neutral" }}
        />
      ),
    },
    {
      key: "createdAt",
      header: "Date",
      render: (reward) => (
        <span className="text-muted-foreground whitespace-nowrap">{formatDateTime(reward.createdAt)}</span>
      ),
    },
  ];

  const loading = dashboard.isLoading || rules.isLoading || rewards.isLoading;
  const errors = [dashboard.error, rules.error, rewards.error].find(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Commissions"
        description="Three-level commission rules and the reward payouts generated across the network."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Commissions" }]}
        actions={<DemoDataBadge />}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Team rewards issued"
          value={loading ? undefined : formatCompactKES(dashboard.data?.teamRewardsIssued ?? 0)}
          icon={<Coins className="size-5" />}
          supporting="Claimed only"
          loading={loading}
        />
        <StatCard
          label="Rewards this month"
          value={loading ? undefined : formatCompactKES(rewardsThisMonth)}
          icon={<Scale className="size-5" />}
          supporting="Claimed this calendar month"
          loading={loading}
        />
        <StatCard
          label="Active rules"
          value={loading ? undefined : String(activeRules)}
          icon={<Percent className="size-5" />}
          supporting="Commission tiers"
          loading={loading}
        />
        <StatCard
          label="Reward records"
          value={loading ? undefined : String(rewardsList.length)}
          icon={<Users className="size-5" />}
          supporting="All statuses"
          loading={loading}
        />
      </div>

      <section aria-labelledby="commission-rules-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="commission-rules-heading" className="text-base font-extrabold tracking-tight">
            Commission rules
          </h2>
          <span className="text-xs text-muted-foreground">Changes are saved to the operations database.</span>
        </div>

        {rules.isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} lines={3} />
            ))}
          </div>
        ) : rules.error ? (
          <ErrorState
            title="Could not load rules"
            description={rules.error.message}
            onRetry={() => void rules.refetch()}
          />
        ) : !rules.data || rules.data.length === 0 ? (
          <EmptyState
            title="No commission rules"
            description="Rules define the percentage earned per team level."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(rules.data as CommissionRule[]).map((rule) => (
              <Card key={rule.id} className={cn(!rule.active && "opacity-60")}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {rule.name}
                    <StatusBadge
                      status={rule.active ? "active" : "inactive"}
                      meta={
                        rule.active
                          ? { label: "Active", tone: "success" }
                          : { label: "Inactive", tone: "neutral" }
                      }
                      dot={false}
                    />
                  </CardTitle>
                  <CardDescription>Level {rule.level}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="numeric text-3xl font-extrabold tracking-tight text-primary">
                    {formatPercent(rule.percent, 1)}
                  </p>
                  <div className="text-xs text-muted-foreground">
                    <p>
                      Min rank:{" "}
                      <span className="font-semibold text-foreground">
                        {RANK_META[rule.minRank]?.label ?? rule.minRank}
                      </span>
                    </p>
                    <p className="mt-1">
                      Updated{" "}
                      <span className="numeric font-semibold text-foreground">
                        {formatDateTime(rule.updatedAt)}
                      </span>
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const result = await updateCommissionRule(rule.id, rule.percent, !rule.active);
                      if (!result.ok) toast.error(result.message);
                      else toast.success(`Level ${rule.level} commission ${result.data.active ? "enabled" : "disabled"}.`);
                    }}
                  >
                    {rule.active ? "Disable rule" : "Enable rule"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="payouts-heading" className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 id="payouts-heading" className="text-base font-extrabold tracking-tight">
            Reward payouts
          </h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search reference or member…"
              className="sm:w-64"
            />
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[130px]" aria-label="Filter by level">
                <SelectValue placeholder="All levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                <SelectItem value="1">Level 1</SelectItem>
                <SelectItem value="2">Level 2</SelectItem>
                <SelectItem value="3">Level 3</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]" aria-label="Filter by status">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="claimed">Claimed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reversed">Reversed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : errors ? (
          <ErrorState
            title="Could not load payouts"
            description={errors.message}
            onRetry={() => {
              void dashboard.refetch();
              void rules.refetch();
              void rewards.refetch();
            }}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No payouts found"
            description="No reward records match the current filters."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setLevelFilter("all");
                  setStatusFilter("all");
                  setSearch("");
                }}
              >
                Reset filters
              </Button>
            }
          />
        ) : (
          <>
            <DataTable<TeamReward>
              columns={columns}
              rows={pageRows}
              keyExtractor={(reward) => reward.id}
              emptyState={
                <EmptyState
                  title="Nothing to display"
                  description="No reward records matched the active filters."
                />
              }
            />
            <div className="flex items-center justify-between gap-3" aria-label="Pagination">
              <p className="numeric text-xs text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
                {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                >
                  Next
                  <ChevronRight />
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

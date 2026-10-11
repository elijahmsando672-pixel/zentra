"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Eye, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { InvestmentStatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { ProductIcon, ProductTierChip } from "@/components/products/product-components";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApiQuery } from "@/hooks/use-api";
import { getAdminInvestments } from "@/lib/services/admin";
import { formatCompactKES, formatDateTime, formatKES, formatShortDate } from "@/lib/utils";
import type { Investment, InvestmentStatus } from "@/lib/types";

const PAGE_SIZE = 10;

const STATUS_TABS: { value: InvestmentStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "maturing", label: "Maturing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function progressPercent(inv: Investment) {
  if (inv.product.durationDays <= 0) return 0;
  return Math.min(100, Math.round((inv.daysElapsed / inv.product.durationDays) * 100));
}

function Pager({
  page,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="numeric text-xs text-muted-foreground">
        Showing {from}–{to} of {total} investments
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label="Previous page"
        >
          Previous
        </Button>
        <span className="numeric text-xs font-semibold text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          aria-label="Next page"
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function InfoField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold break-words">{children}</dd>
    </div>
  );
}

export default function AdminInvestmentsPage() {
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [status, setStatus] = React.useState<InvestmentStatus | "all">("all");
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<Investment | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  React.useEffect(() => {
    setPage(1);
  }, [debounced, status]);

  const investments = useApiQuery(
    ["admin", "investments", "list", debounced],
    () => getAdminInvestments({ search: debounced || undefined })
  );

  const all = investments.data ?? [];
  const filtered = status === "all" ? all : all.filter((i) => i.status === status);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const totalInvested = all.reduce((sum, i) => sum + i.amount, 0);
  const activeCount = all.filter((i) => i.status === "active").length;
  const maturedCount = all.filter((i) => i.status === "completed").length;
  const projectedPayouts = all.reduce((sum, i) => sum + i.projectedPayout, 0);

  const columns: DataTableColumn<Investment>[] = [
    {
      key: "reference",
      header: "Reference",
      primary: true,
      render: (row) => (
        <div className="min-w-0">
          <p className="numeric truncate text-sm font-bold">{row.reference}</p>
          <p className="truncate text-xs text-muted-foreground">{row.product.name}</p>
        </div>
      ),
    },
    {
      key: "product",
      header: "Plan",
      secondary: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <ProductIcon icon={row.product.icon} tier={row.product.tier} className="size-9" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{row.product.name}</p>
            <span className="numeric text-[11px] text-muted-foreground">{row.product.dailyRate}% daily</span>
          </div>
        </div>
      ),
    },
    {
      key: "principal",
      header: "Principal",
      render: (row) => (
        <span className="numeric text-sm font-extrabold">{formatKES(row.amount, { decimals: 0 })}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <InvestmentStatusBadge status={row.status} />,
    },
    {
      key: "daily",
      header: "Daily earning",
      hideOnMobile: true,
      render: (row) => (
        <span className="numeric text-xs font-bold text-success">{formatKES(row.dailyEarning)}</span>
      ),
    },
    {
      key: "start",
      header: "Start",
      hideOnMobile: true,
      render: (row) => <span className="text-xs text-muted-foreground">{formatShortDate(row.startDate)}</span>,
    },
    {
      key: "maturity",
      header: "Maturity",
      render: (row) => <span className="text-xs text-muted-foreground">{formatShortDate(row.maturityDate)}</span>,
    },
    {
      key: "progress",
      header: "Progress",
      render: (row) => (
        <div className="w-32 space-y-1.5">
          <Progress value={progressPercent(row)} />
          <p className="numeric text-[10px] text-muted-foreground">
            {progressPercent(row)}% · day {row.daysElapsed}/{row.product.durationDays}
          </p>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelected(row)}
            aria-label={`View investment ${row.reference}`}
          >
            <Eye />
            View
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investments"
        description="All member commitments across product plans, with lifecycle progress."
        actions={<DemoDataBadge />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total invested"
          value={formatCompactKES(totalInvested)}
          loading={investments.isLoading}
          icon={<TrendingUp className="size-5" />}
          supporting="Across all commitments"
        />
        <StatCard
          label="Active"
          value={activeCount}
          loading={investments.isLoading}
          supporting="Earning daily returns"
        />
        <StatCard
          label="Matured"
          value={maturedCount}
          loading={investments.isLoading}
          supporting="Completed plans"
        />
        <StatCard
          label="Projected payouts"
          value={formatCompactKES(projectedPayouts)}
          loading={investments.isLoading}
          supporting="Principal plus earnings"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search reference or plan name"
          className="sm:max-w-sm sm:flex-1"
        />
        <Tabs value={status} onValueChange={(v) => setStatus(v as InvestmentStatus | "all")}>
          <TabsList className="h-auto flex-wrap">
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {investments.isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : investments.error ? (
        <ErrorState
          title="Could not load investments"
          description={investments.error.message}
          onRetry={() => void investments.refetch()}
        />
      ) : rows.length > 0 ? (
        <div className="space-y-4">
          <DataTable
            columns={columns}
            rows={rows}
            keyExtractor={(row) => row.id}
            onRowClick={(row) => setSelected(row)}
          />
          <Pager page={safePage} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
        </div>
      ) : (
        <EmptyState
          title="No investments found"
          description="No commitments match the current search and status filter."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setStatus("all");
              }}
            >
              Reset filters
            </Button>
          }
        />
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <ProductIcon icon={selected.product.icon} tier={selected.product.tier} className="size-11" />
                  <span>
                    {selected.product.name}
                    <span className="numeric block text-xs font-normal text-muted-foreground">
                      {selected.reference}
                    </span>
                  </span>
                </DialogTitle>
                <DialogDescription>Commitment record and lifecycle details.</DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap items-center gap-2">
                <InvestmentStatusBadge status={selected.status} />
                <ProductTierChip tier={selected.product.tier} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Term progress
                  </p>
                  <span className="numeric text-xs font-bold">
                    Day {selected.daysElapsed} of {selected.product.durationDays} · {selected.daysRemaining} remaining
                  </span>
                </div>
                <Progress value={progressPercent(selected)} />
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                <InfoField label="Principal">
                  <span className="numeric">{formatKES(selected.amount)}</span>
                </InfoField>
                <InfoField label="Daily earning">
                  <span className="numeric text-success">{formatKES(selected.dailyEarning)}</span>
                </InfoField>
                <InfoField label="Earned to date">
                  <span className="numeric">{formatKES(selected.earnedToDate)}</span>
                </InfoField>
                <InfoField label="Projected earnings">
                  <span className="numeric">{formatKES(selected.projectedEarnings)}</span>
                </InfoField>
                <InfoField label="Projected payout">
                  <span className="numeric">{formatKES(selected.projectedPayout)}</span>
                </InfoField>
                <InfoField label="Daily rate">
                  <span className="numeric">{selected.product.dailyRate}%</span>
                </InfoField>
                <InfoField label="Start date">{formatDateTime(selected.startDate)}</InfoField>
                <InfoField label="Maturity date">{formatDateTime(selected.maturityDate)}</InfoField>
                <InfoField label="Source wallet">
                  <span className="capitalize">{selected.wallet.replace("_", " ")}</span>
                </InfoField>
                <InfoField label="Created">{formatDateTime(selected.createdAt)}</InfoField>
                <InfoField label="Plan slug">
                  <span className="numeric">{selected.product.slug}</span>
                </InfoField>
                <InfoField label="Certificate">
                  <span className="numeric text-xs">{selected.certificateUrl}</span>
                </InfoField>
              </dl>

              <Separator />

              <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
                The day-by-day earning schedule for this commitment is maintained on the member record.{" "}
                <Link href={`/investments/${selected.id}`} className="font-semibold text-foreground underline">
                  Open earning schedule
                </Link>{" "}
                to review credited and scheduled days.
              </div>

              <DialogFooter>
                <Button asChild variant="outline">
                  <Link href={`/investments/${selected.id}`}>
                    Earning schedule
                    <ArrowRight />
                  </Link>
                </Button>
                <Button variant="ghost" onClick={() => setSelected(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

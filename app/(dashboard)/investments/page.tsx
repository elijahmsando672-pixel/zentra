"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  CalendarCheck,
  CircleCheck,
  PiggyBank,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { InvestmentStatusBadge } from "@/components/shared/status-badge";
import { InvestmentProgressBar } from "@/components/financial/financial";
import { ProductIcon } from "@/components/products/product-components";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiQuery } from "@/hooks/use-api";
import { getInvestments } from "@/lib/services/investments";
import { formatDate, formatKES, formatShortDate } from "@/lib/utils";
import type { InvestmentStatus } from "@/lib/types";

const FILTERS: { value: InvestmentStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "maturing", label: "Maturing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function InvestmentsPage() {
  const { data, isLoading, error, refetch } = useApiQuery(["investments"], () => getInvestments({}));
  const [status, setStatus] = useState<InvestmentStatus | "all">("all");

  const all = data ?? [];
  const filtered =
    status === "all" ? all : all.filter((inv) => (status === "maturing" ? inv.status === "maturing" : inv.status === status));

  const totalInvested = all.reduce((s, i) => s + i.amount, 0);
  const activeCount = all.filter((i) => i.status === "active" || i.status === "maturing").length;
  const projectedPayout = all.reduce((s, i) => s + i.projectedPayout, 0);
  const matured = all.filter((i) => i.status === "completed").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My investments"
        description="Track every commitment from placement through to maturity, with projected and credited earnings."
        actions={
          <>
            <DemoDataBadge />
            <Button asChild>
              <Link href="/dashboard/products">
                Browse products
                <ArrowRight />
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total invested"
          value={isLoading ? undefined : formatKES(totalInvested, { decimals: 0 })}
          icon={<PiggyBank className="size-5" />}
          loading={isLoading}
          supporting="Across all plans"
        />
        <StatCard
          label="Active plans"
          value={isLoading ? undefined : activeCount}
          icon={<Briefcase className="size-5" />}
          loading={isLoading}
          supporting="Active or maturing"
        />
        <StatCard
          label="Projected payout"
          value={isLoading ? undefined : formatKES(projectedPayout, { decimals: 0 })}
          icon={<TrendingUp className="size-5" />}
          loading={isLoading}
          supporting="Incl. projected earnings"
        />
        <StatCard
          label="Already matured"
          value={isLoading ? undefined : matured}
          icon={<CalendarCheck className="size-5" />}
          loading={isLoading}
          supporting="Completed plans"
        />
      </div>

      <Tabs value={status} onValueChange={(v) => setStatus(v as InvestmentStatus | "all")}>
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          {FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-3">
          <CardSkeleton lines={4} />
          <CardSkeleton lines={4} />
        </div>
      ) : error ? (
        <ErrorState
          title="Could not load investments"
          description={error.message}
          onRetry={() => void refetch()}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<CircleCheck />}
          title={status === "all" ? "No investments yet" : `No ${status} investments`}
          description={
            status === "all"
              ? "Start with a member plan to grow a portfolio with projected daily earnings."
              : "No commitments match this status right now."
          }
          action={
            status === "all" ? (
              <Button asChild>
                <Link href="/dashboard/products">Browse products</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((inv) => {
            const percent =
              inv.product.durationDays > 0 ? (inv.daysElapsed / inv.product.durationDays) * 100 : 0;
            return (
              <Link key={inv.id} href={`/investments/${inv.id}`} className="block group">
                <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                      <ProductIcon icon={inv.product.icon} tier={inv.product.tier} />
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-extrabold group-hover:underline">
                            {inv.product.name}
                          </p>
                          <InvestmentStatusBadge status={inv.status} />
                        </div>
                        <p className="numeric text-xs text-muted-foreground">{inv.reference}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(inv.startDate)} → {formatDate(inv.maturityDate)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 lg:w-80">
                      <dl className="space-y-0.5">
                        <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Principal
                        </dt>
                        <dd className="numeric text-sm font-extrabold">{formatKES(inv.amount, { decimals: 0 })}</dd>
                      </dl>
                      <dl className="space-y-0.5">
                        <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Current value
                        </dt>
                        <dd className="numeric text-sm font-extrabold text-success">
                          {formatKES(inv.amount + inv.earnedToDate)}
                        </dd>
                      </dl>
                      <dl className="space-y-0.5">
                        <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Daily earning
                        </dt>
                        <dd className="numeric text-sm font-extrabold">{formatKES(inv.dailyEarning)}</dd>
                      </dl>
                      <dl className="space-y-0.5">
                        <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Earned to date
                        </dt>
                        <dd className="numeric text-sm font-extrabold">{formatKES(inv.earnedToDate)}</dd>
                      </dl>
                    </div>

                    <div className="lg:w-56">
                      <InvestmentProgressBar
                        percent={percent}
                        daysElapsed={inv.daysElapsed}
                        daysTotal={inv.product.durationDays}
                        statusLabel={`${inv.daysRemaining} days left · ends ${formatShortDate(inv.maturityDate)}`}
                      />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
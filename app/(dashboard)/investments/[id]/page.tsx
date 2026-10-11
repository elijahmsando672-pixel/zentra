"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Receipt, Wallet } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { InvestmentStatusBadge, StatusBadge } from "@/components/shared/status-badge";
import {
  InvestmentProgressBar,
  ReceiptPreview,
} from "@/components/financial/financial";
import { EarningsBarChart } from "@/components/charts/charts";
import { ProductIcon } from "@/components/products/product-components";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useApiQuery } from "@/hooks/use-api";
import { getEarningSchedule, getInvestmentById } from "@/lib/services/investments";
import { WALLET_META } from "@/lib/constants";
import {
  formatDate,
  formatDateTime,
  formatKES,
  formatPercent,
  formatShortDate,
} from "@/lib/utils";
import type { EarningStatus } from "@/lib/types";

const EARNING_META: Record<EarningStatus, { label: string; tone: string }> = {
  credited: { label: "Credited", tone: "success" },
  scheduled: { label: "Scheduled", tone: "info" },
  skipped: { label: "Skipped", tone: "neutral" },
};

export default function InvestmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);

  const investment = useApiQuery(["investment", id], () => getInvestmentById(id));
  const schedule = useApiQuery(["earning-schedule", id], () => getEarningSchedule(id));

  const inv = investment.data;

  const percent = inv && inv.product.durationDays > 0
    ? (inv.daysElapsed / inv.product.durationDays) * 100
    : 0;
  const chartData =
    schedule.data?.items.map((item) => ({
      label: `D${item.day}`,
      value: item.amount,
    })) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={inv?.product.name ?? "Investment"}
        description={inv ? `Commitment ${inv.reference}` : undefined}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "My Investments", href: "/investments" },
          { label: inv?.reference ?? "Loading" },
        ]}
        actions={<DemoDataBadge />}
      />

      {investment.isLoading ? (
        <CardSkeleton lines={6} />
      ) : investment.error || !inv ? (
        <ErrorState
          title="Could not load this investment"
          description={investment.error?.message ?? "The investment could not be found."}
          onRetry={() => void investment.refetch()}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/investments">
                <ArrowLeft />
                Back to investments
              </Link>
            </Button>
            <InvestmentStatusBadge status={inv.status} />
          </div>

          <Card>
            <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start">
              <ProductIcon icon={inv.product.icon} tier={inv.product.tier} className="size-14" />
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight">{inv.product.name}</h2>
                  <p className="numeric text-xs text-muted-foreground">{inv.reference}</p>
                </div>
                <InvestmentProgressBar
                  percent={percent}
                  daysElapsed={inv.daysElapsed}
                  daysTotal={inv.product.durationDays}
                  statusLabel={`${inv.daysRemaining} days remaining`}
                />
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    Current value{" "}
                    <span className="numeric font-bold text-foreground">
                      {formatKES(inv.amount + inv.earnedToDate)}
                    </span>
                  </span>
                  <span>
                    Principal{" "}
                    <span className="numeric font-bold">{formatKES(inv.amount, { decimals: 0 })}</span>
                  </span>
                  <span>
                    Projected payout{" "}
                    <span className="numeric font-bold text-success">{formatKES(inv.projectedPayout, { decimals: 0 })}</span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardContent className="space-y-4 p-6">
                  <div>
                    <h3 className="text-sm font-extrabold uppercase tracking-wider">Earning schedule</h3>
                    <p className="text-xs text-muted-foreground">
                      Daily projections for the full {inv.product.durationDays}-day plan.
                    </p>
                  </div>
                  {schedule.isLoading ? (
                    <CardSkeleton lines={4} />
                  ) : schedule.error || !schedule.data ? (
                    <EmptyState
                      icon={<Receipt />}
                      title="No schedule available"
                      description={
                        schedule.error?.message ??
                        "Earning projections are not available for this investment."
                      }
                    />
                  ) : (
                    <>
                      <EarningsBarChart data={chartData} height={220} />
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                        <span className="text-muted-foreground">
                          Credited so far{" "}
                          <span className="numeric font-extrabold text-success">
                            {formatKES(schedule.data.totalCredited)}
                          </span>
                        </span>
                        <span className="text-muted-foreground">
                          Scheduled total{" "}
                          <span className="numeric font-extrabold text-foreground">
                            {formatKES(schedule.data.totalScheduled)}
                          </span>
                        </span>
                      </div>
                      <Separator />
                      <div className="max-h-72 space-y-1 overflow-y-auto pr-1" aria-label="Schedule list">
                        {schedule.data.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/40"
                          >
                            <span className="flex items-center gap-3">
                              <span className="numeric w-8 shrink-0 text-xs font-bold text-muted-foreground">
                                Day {item.day}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatShortDate(item.date)}
                              </span>
                            </span>
                            <span className="flex items-center gap-3">
                              <span className="numeric font-bold">{formatKES(item.amount)}</span>
                              <StatusBadge status={item.status} meta={EARNING_META[item.status]} />
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-4 p-6">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider">Details</h3>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Daily rate
                      </dt>
                      <dd className="numeric mt-0.5 font-extrabold">
                        {formatPercent(inv.product.dailyRate, 1)} / day
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Daily earning
                      </dt>
                      <dd className="numeric mt-0.5 font-extrabold">{formatKES(inv.dailyEarning)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Wallet
                      </dt>
                      <dd className="mt-0.5 flex items-center gap-1.5 font-bold">
                        <Wallet className="size-3.5 text-muted-foreground" />
                        {WALLET_META[inv.wallet].label}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Started
                      </dt>
                      <dd className="mt-0.5 font-semibold">{formatDate(inv.startDate)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Matures
                      </dt>
                      <dd className="mt-0.5 font-semibold">{formatDate(inv.maturityDate)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Progress
                      </dt>
                      <dd className="numeric mt-0.5 font-extrabold">
                        Day {inv.daysElapsed} of {inv.product.durationDays}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardContent className="space-y-4 p-6">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider">Summary</h3>
                  <dl className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Principal</dt>
                      <dd className="numeric font-bold">{formatKES(inv.amount, { decimals: 0 })}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Earned to date</dt>
                      <dd className="numeric font-bold text-success">{formatKES(inv.earnedToDate)}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Projected earnings</dt>
                      <dd className="numeric font-bold">{formatKES(inv.projectedEarnings)}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Projected payout</dt>
                      <dd className="numeric font-extrabold text-success">
                        {formatKES(inv.projectedPayout, { decimals: 0 })}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              <ReceiptPreview
                reference={inv.reference}
                title={inv.product.name}
                amount={formatKES(inv.amount, { decimals: 0 })}
                net={formatKES(inv.projectedPayout, { decimals: 0 })}
                status={<InvestmentStatusBadge status={inv.status} />}
                date={formatDateTime(inv.createdAt)}
                meta={[
                  { label: "Daily earning", value: formatKES(inv.dailyEarning) },
                  { label: "Duration", value: `${inv.product.durationDays} days` },
                  { label: "Wallet", value: WALLET_META[inv.wallet].label },
                ]}
              />
              <Button asChild variant="outline" className="w-full">
                <Link href="/records">
                  <Receipt />
                  View related record
                </Link>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
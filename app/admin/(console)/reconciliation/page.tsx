"use client";

import { useMemo } from "react";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, CheckCircle2, Scale, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { ErrorState, TableSkeleton } from "@/components/shared/states";
import { SimpleLineChart } from "@/components/charts/charts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApiQuery } from "@/hooks/use-api";
import {
  getAdminDashboard,
  getAdminDeposits,
  getAdminWithdrawals,
  getLedger,
  getReconciliationReviews,
  markReconciliationReviewed,
} from "@/lib/services/admin";
import { formatCompactKES, formatKES, formatShortDate, cn } from "@/lib/utils";
import { toast } from "sonner";

const DAY = 86_400_000;
const RANGE_DAYS = 14;

function dayKey(value: string | Date) {
  return new Date(value).toDateString();
}

interface DayRow {
  date: Date;
  key: string;
  deposits: number;
  withdrawals: number;
  ledgerMovement: number;
  expected: number;
  variance: number;
  matched: boolean;
}

export default function ReconciliationPage() {
  const dashboard = useApiQuery(["admin", "recon", "dashboard"], getAdminDashboard);
  const deposits = useApiQuery(["admin", "recon", "deposits"], () =>
    getAdminDeposits({ page: 1, pageSize: 200 })
  );
  const withdrawals = useApiQuery(["admin", "recon", "withdrawals"], () =>
    getAdminWithdrawals({ page: 1, pageSize: 200 })
  );
  const ledger = useApiQuery(["admin", "recon", "ledger"], () => getLedger({}));
  const reviews = useApiQuery(["admin", "recon", "reviews"], getReconciliationReviews);

  const rows = useMemo<DayRow[]>(() => {
    const days: DayRow[] = Array.from({ length: RANGE_DAYS }, (_, i) => {
      const date = new Date(Date.now() - (RANGE_DAYS - 1 - i) * DAY);
      return {
        date,
        key: date.toDateString(),
        deposits: 0,
        withdrawals: 0,
        ledgerMovement: 0,
        expected: 0,
        variance: 0,
        matched: true,
      };
    });
    const index = new Map(days.map((d) => [d.key, d]));

    for (const deposit of deposits.data?.items ?? []) {
      if (deposit.status !== "completed") continue;
      const row = index.get(dayKey(deposit.createdAt));
      if (row) row.deposits += deposit.amount;
    }

    for (const withdrawal of withdrawals.data?.items ?? []) {
      if (withdrawal.status === "rejected" || withdrawal.status === "cancelled") continue;
      const row = index.get(dayKey(withdrawal.createdAt));
      if (row) row.withdrawals += withdrawal.amount;
    }

    for (const journal of ledger.data?.items ?? []) {
      if (journal.type !== "deposit" && journal.type !== "withdrawal") continue;
      const row = index.get(dayKey(journal.createdAt));
      if (!row) continue;
      row.ledgerMovement += journal.type === "deposit" ? journal.totalAmount : -journal.totalAmount;
    }

    for (const row of days) {
      row.expected = row.deposits - row.withdrawals;
      row.variance = row.expected - row.ledgerMovement;
      row.matched = Math.abs(row.variance) < 0.005;
    }
    return days;
  }, [deposits.data, withdrawals.data, ledger.data]);

  const matchedCount = rows.filter((r) => r.matched).length;
  const totalDeposits = rows.reduce((s, r) => s + r.deposits, 0);
  const totalWithdrawals = rows.reduce((s, r) => s + r.withdrawals, 0);
  const reviewedKeys = new Set((reviews.data ?? []).map((review) => review.dayKey));
  const reviewedCount = rows.filter((r) => reviewedKeys.has(r.key)).length;

  const mismatches = dashboard.data?.reconciliationMismatches ?? 0;
  const hasAny = rows.some((r) => r.deposits > 0 || r.withdrawals > 0);

  const depositsSeries = rows.map((r) => ({ label: formatShortDate(r.date), value: r.deposits }));
  const withdrawalsSeries = rows.map((r) => ({ label: formatShortDate(r.date), value: r.withdrawals }));

  const errors = [dashboard.error, deposits.error, withdrawals.error, ledger.error, reviews.error].find(Boolean);
  const loading = dashboard.isLoading || deposits.isLoading || withdrawals.isLoading || ledger.isLoading || reviews.isLoading;

  const markReviewed = async (row: DayRow) => {
    const result = await markReconciliationReviewed(row.key);
    if (!result.ok) toast.error(result.message);
    else toast.success("Reconciliation review saved.");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reconciliation"
        description="Daily comparison of deposit and withdrawal movements against ledger postings."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Reconciliation" }]}
        actions={<DemoDataBadge />}
      />

      <Alert variant="info">
        <ShieldAlert />
        <AlertTitle>Reconciliation data sources</AlertTitle>
        <AlertDescription>
          No external bank feed is connected. Deposits and withdrawals are read from the service
          database and compared with matching ledger journals; some records may be sample data.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Reconciliation mismatches"
          value={loading ? undefined : String(mismatches)}
          icon={<AlertTriangle className="size-5" />}
          supporting={mismatches > 0 ? "Requires review" : "All clear"}
          loading={loading}
          className={mismatches > 0 ? "border-t-2 border-danger" : "border-t-2 border-success"}
        />
        <StatCard
          label="Days matched"
          value={loading ? undefined : String(matchedCount)}
          icon={<CheckCircle2 className="size-5" />}
          supporting={`of ${RANGE_DAYS} days`}
          loading={loading}
        />
        <StatCard
          label="Deposits (14d)"
          value={loading ? undefined : formatCompactKES(totalDeposits)}
          icon={<ArrowDownLeft className="size-5" />}
          supporting="Completed settlements"
          loading={loading}
        />
        <StatCard
          label="Withdrawals (14d)"
          value={loading ? undefined : formatCompactKES(totalWithdrawals)}
          icon={<ArrowUpRight className="size-5" />}
          supporting="Excluding rejected"
          loading={loading}
        />
      </div>

      {loading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : errors ? (
        <ErrorState
          title="Could not load reconciliation data"
          description={errors.message}
          onRetry={() => {
            void dashboard.refetch();
            void deposits.refetch();
            void withdrawals.refetch();
            void ledger.refetch();
          }}
        />
      ) : !hasAny ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <Scale className="size-10 text-muted-foreground" />
            <div className="space-y-1.5">
              <p className="text-base font-bold">No reconciliation data</p>
              <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                No deposits, withdrawals or matching ledger journals were found for the last{" "}
                {RANGE_DAYS} days.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowDownLeft className="size-4 text-success" />
                  Daily deposits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleLineChart data={depositsSeries} color="#18b97a" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpRight className="size-4 text-warning" />
                  Daily withdrawals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleLineChart data={withdrawalsSeries} color="#f59e0b" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Daily variance</CardTitle>
              <StatusBadge
                status="reviewed"
                dot={false}
                meta={
                  reviewedCount === RANGE_DAYS
                    ? { label: `${reviewedCount} of ${RANGE_DAYS} reviewed`, tone: "success" }
                    : { label: `${reviewedCount} of ${RANGE_DAYS} reviewed`, tone: "warning" }
                }
              />
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Deposits</TableHead>
                      <TableHead className="text-right">Withdrawals</TableHead>
                      <TableHead className="text-right">Ledger movement</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => {
                      const isReviewed = reviewedKeys.has(row.key);
                      return (
                        <TableRow key={row.key}>
                          <TableCell className="font-semibold whitespace-nowrap">
                            {formatShortDate(row.date)}
                          </TableCell>
                          <TableCell className="numeric text-right text-success font-semibold">
                            {formatKES(row.deposits)}
                          </TableCell>
                          <TableCell className="numeric text-right text-warning font-semibold">
                            {formatKES(row.withdrawals)}
                          </TableCell>
                          <TableCell className="numeric text-right">{formatKES(row.ledgerMovement)}</TableCell>
                          <TableCell className="numeric text-right">
                            <span
                              className={cn(
                                "font-bold",
                                row.matched ? "text-success" : Math.abs(row.variance) < 500 ? "text-warning" : "text-danger"
                              )}
                            >
                              {row.matched ? "0.00" : row.variance > 0 ? `+${formatKES(row.variance)}` : formatKES(row.variance)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              status={row.matched ? "matched" : "reviewing"}
                              meta={
                                row.matched
                                  ? { label: "Matched", tone: "success" }
                                  : { label: "Review", tone: "warning" }
                              }
                            />
                            {isReviewed && (
                              <span className="ml-2 text-xs font-semibold text-success">Reviewed</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant={isReviewed ? "ghost" : "outline"}
                              size="sm"
                              disabled={isReviewed}
                              onClick={() => markReviewed(row)}
                              aria-label={`Mark ${formatShortDate(row.date)} reviewed`}
                            >
                              {isReviewed ? "Reviewed" : "Mark reviewed"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

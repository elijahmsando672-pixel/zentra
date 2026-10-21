"use client";

import * as React from "react";
import { endOfMonth, format, startOfMonth, startOfYear, subMonths } from "date-fns";
import { AlertTriangle, CalendarRange, CheckCircle2, Download, FileText, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { TransactionStatusBadge } from "@/components/shared/status-badge";
import { CardSkeleton, EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApiQuery } from "@/hooks/use-api";
import { getStatement, statementExportUrl } from "@/lib/services/statements";
import { STATUS_META, TRANSACTION_TYPE_META } from "@/lib/constants";
import type { StatementQuery, TransactionStatus, TransactionType } from "@/lib/types";
import { cn, formatKES } from "@/lib/utils";
import { toast } from "sonner";

const PAGE_SIZE = 25;
const MAX_DAYS = 366;

const inputDate = (date: Date) => format(date, "yyyy-MM-dd");
const fromCents = (cents: number) => cents / 100;

const PRESETS = [
  {
    label: "This month",
    range: () => ({ from: inputDate(startOfMonth(new Date())), to: inputDate(new Date()) }),
  },
  {
    label: "Last month",
    range: () => {
      const last = subMonths(new Date(), 1);
      return { from: inputDate(startOfMonth(last)), to: inputDate(endOfMonth(last)) };
    },
  },
  {
    label: "Last 3 months",
    range: () => ({ from: inputDate(startOfMonth(subMonths(new Date(), 2))), to: inputDate(new Date()) }),
  },
  {
    label: "Last 6 months",
    range: () => ({ from: inputDate(startOfMonth(subMonths(new Date(), 5))), to: inputDate(new Date()) }),
  },
  {
    label: "Year to date",
    range: () => ({ from: inputDate(startOfYear(new Date())), to: inputDate(new Date()) }),
  },
];

function SummaryTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "credit" | "debit";
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">{label}</p>
      <p
        className={cn(
          "numeric mt-1.5 text-lg font-extrabold",
          accent === "credit" && "text-success",
          accent === "debit" && "text-foreground"
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function StatementsPage() {
  const defaultRange = React.useMemo(() => PRESETS[2].range(), []);
  const [from, setFrom] = React.useState(defaultRange.from);
  const [to, setTo] = React.useState(defaultRange.to);
  const [type, setType] = React.useState<"all" | TransactionType>("all");
  const [status, setStatus] = React.useState<"all" | TransactionStatus>("all");
  const [page, setPage] = React.useState(1);

  const rangeValid = Boolean(from && to && new Date(from) <= new Date(to));
  const rangeDays = rangeValid
    ? Math.ceil((new Date(`${to}T23:59:59.999`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86_400_000)
    : 0;
  const rangeTooLong = rangeDays > MAX_DAYS;

  const query: StatementQuery = React.useMemo(
    () => ({
      from,
      to,
      ...(type !== "all" ? { types: [type] } : {}),
      ...(status !== "all" ? { statuses: [status] } : {}),
    }),
    [from, to, type, status]
  );
  const queryKey = JSON.stringify(query);

  const { data, isLoading, isFetching, error, refetch } = useApiQuery(
    ["statement", queryKey],
    () => getStatement(query),
    {
      enabled: rangeValid && !rangeTooLong,
      placeholderData: (previous) => previous,
    }
  );

  React.useEffect(() => {
    setPage(1);
  }, [queryKey]);

  const rows = data?.rows ?? [];
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const visibleRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const download = (exportFormat: "csv" | "pdf") => {
    if (!rangeValid || rangeTooLong) {
      toast.error("Choose a valid period before downloading.");
      return;
    }
    if (!data) {
      toast.error("Wait for the statement to load, then try again.");
      return;
    }
    const anchor = document.createElement("a");
    anchor.href = statementExportUrl(query, exportFormat);
    anchor.download = "";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const applyPreset = (range: { from: string; to: string }) => {
    setFrom(range.from);
    setTo(range.to);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account statements"
        description="Download an official record of your Zentra activity for any period up to 366 days. Statements reconcile your wallet balances with posted ledger entries."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Statements" }]}
        actions={
          <>
            <Button variant="outline" onClick={() => download("csv")} disabled={!data || isLoading}>
              <Download /> CSV
            </Button>
            <Button onClick={() => download("pdf")} disabled={!data || isLoading}>
              <FileText /> PDF
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarRange className="size-4 text-primary" /> Statement period
          </CardTitle>
          <CardDescription>Select a date range and optional filters. Balances include all wallets.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => {
              const presetRange = preset.range();
              const active = presetRange.from === from && presetRange.to === to;
              return (
                <Button
                  key={preset.label}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "outline"}
                  onClick={() => applyPreset(presetRange)}
                >
                  {preset.label}
                </Button>
              );
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="statement-from">Start date</Label>
              <Input
                id="statement-from"
                type="date"
                value={from}
                max={to || undefined}
                onChange={(event) => setFrom(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="statement-to">End date</Label>
              <Input
                id="statement-to"
                type="date"
                value={to}
                min={from || undefined}
                max={inputDate(new Date())}
                onChange={(event) => setTo(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="statement-type">Transaction type</Label>
              <Select value={type} onValueChange={(value) => setType(value as typeof type)}>
                <SelectTrigger id="statement-type">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {(Object.keys(TRANSACTION_TYPE_META) as TransactionType[]).map((value) => (
                    <SelectItem key={value} value={value}>
                      {TRANSACTION_TYPE_META[value].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="statement-status">Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
                <SelectTrigger id="statement-status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {(Object.keys(STATUS_META) as TransactionStatus[]).map((value) => (
                    <SelectItem key={value} value={value}>
                      {STATUS_META[value].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!rangeValid && (
            <p className="text-sm font-medium text-danger">The start date must be on or before the end date.</p>
          )}
          {rangeValid && rangeTooLong && (
            <p className="text-sm font-medium text-danger">
              Statements cover at most {MAX_DAYS} days. Narrow the date range.
            </p>
          )}
        </CardContent>
      </Card>

      {isLoading && !data ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <CardSkeleton key={index} lines={2} />
            ))}
          </div>
          <TableSkeleton rows={8} cols={6} />
        </div>
      ) : error ? (
        <ErrorState
          title="We could not build your statement"
          description={error.message}
          onRetry={() => void refetch()}
        />
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryTile
              label="Opening balance"
              value={formatKES(fromCents(data.openingBalanceCents))}
              hint={format(new Date(data.period.from), "dd MMM yyyy")}
            />
            <SummaryTile
              label="Total credits"
              value={formatKES(fromCents(data.totalCreditsCents))}
              hint="Deposits, earnings, rewards"
              accent="credit"
            />
            <SummaryTile
              label="Total debits"
              value={formatKES(fromCents(data.totalDebitsCents))}
              hint="Completed withdrawals"
              accent="debit"
            />
            <SummaryTile
              label="Closing balance"
              value={formatKES(fromCents(data.closingBalanceCents))}
              hint={format(new Date(data.period.to), "dd MMM yyyy")}
            />
          </div>

          <div
            className={cn(
              "flex items-start gap-3 rounded-lg border p-4 text-sm",
              data.reconciliation.ledgerMatchesWallets === false
                ? "border-danger/30 bg-danger/5"
                : "border-border bg-card"
            )}
          >
            {data.reconciliation.ledgerMatchesWallets === false ? (
              <AlertTriangle className="mt-0.5 size-4.5 shrink-0 text-danger" />
            ) : (
              <CheckCircle2 className="mt-0.5 size-4.5 shrink-0 text-success" />
            )}
            <div className="space-y-1">
              <p className="font-semibold">
                {data.reconciliation.ledgerMatchesWallets === false
                  ? "Reconciliation needs review"
                  : "Statement reconciliation"}
              </p>
              <p className="text-muted-foreground">{data.reconciliation.note}</p>
              <p className="numeric text-xs text-muted-foreground">
                Wallet total {formatKES(fromCents(data.reconciliation.walletTotalCents))}
                {data.reconciliation.ledgerLiabilityCents !== null
                  ? ` · Ledger liability ${formatKES(fromCents(data.reconciliation.ledgerLiabilityCents))}`
                  : ""}
                {` · ${data.reconciliation.ledgerPostedEntries} ledger entries`}
              </p>
            </div>
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3">
              <div>
                <CardTitle>Transaction history</CardTitle>
                <CardDescription>
                  {rows.length.toLocaleString()} {rows.length === 1 ? "entry" : "entries"} ·{" "}
                  {format(new Date(data.period.from), "dd MMM yyyy")} – {format(new Date(data.period.to), "dd MMM yyyy")}
                </CardDescription>
              </div>
              {isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            </CardHeader>
            <CardContent className="pt-4">
              {rows.length === 0 ? (
                <EmptyState
                  icon={<FileText />}
                  title="No transactions in this period"
                  description="Try widening the date range or removing filters."
                />
              ) : (
                <div className="space-y-3">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="numeric text-xs text-muted-foreground">
                            {format(new Date(row.createdAt), "dd MMM yyyy HH:mm")}
                          </TableCell>
                          <TableCell className="numeric text-xs font-semibold">{row.reference}</TableCell>
                          <TableCell className="max-w-[260px] truncate text-sm" title={row.description}>
                            {row.description}
                          </TableCell>
                          <TableCell className="text-xs font-medium text-muted-foreground">
                            {TRANSACTION_TYPE_META[row.type]?.label ?? row.type}
                          </TableCell>
                          <TableCell>
                            <TransactionStatusBadge status={row.status} />
                          </TableCell>
                          <TableCell className="numeric text-right text-sm font-semibold text-success">
                            {row.creditCents !== null ? formatKES(fromCents(row.creditCents)) : "—"}
                          </TableCell>
                          <TableCell className="numeric text-right text-sm font-semibold">
                            {row.debitCents !== null ? `-${formatKES(fromCents(row.debitCents))}` : "—"}
                          </TableCell>
                          <TableCell className="numeric text-right text-sm font-semibold">
                            {formatKES(fromCents(row.balanceCents))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={5} className="text-xs font-bold uppercase tracking-wider">
                          Period totals
                        </TableCell>
                        <TableCell className="numeric text-right font-bold text-success">
                          {formatKES(fromCents(data.totalCreditsCents))}
                        </TableCell>
                        <TableCell className="numeric text-right font-bold">
                          -{formatKES(fromCents(data.totalDebitsCents))}
                        </TableCell>
                        <TableCell className="numeric text-right font-bold">
                          {formatKES(fromCents(data.closingBalanceCents))}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, rows.length)} of{" "}
                      {rows.length.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((value) => Math.max(1, value - 1))}
                        disabled={page <= 1}
                      >
                        Previous
                      </Button>
                      <span className="text-xs font-semibold">
                        Page {page} of {pageCount}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                        disabled={page >= pageCount}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {data.totalsByType.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Breakdown by type</CardTitle>
                <CardDescription>Completed activity only. Internal transfers and investments do not change net funds.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 pt-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.totalsByType.map((bucket) => (
                  <div key={bucket.type} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                    <div>
                      <p className="text-xs font-bold">{TRANSACTION_TYPE_META[bucket.type]?.label ?? bucket.type}</p>
                      <p className="text-[11px] text-muted-foreground">{bucket.count} entries</p>
                    </div>
                    <div className="text-right text-xs font-semibold">
                      {bucket.creditsCents > 0 && (
                        <p className="numeric text-success">+{formatKES(fromCents(bucket.creditsCents))}</p>
                      )}
                      {bucket.debitsCents > 0 && (
                        <p className="numeric">-{formatKES(fromCents(bucket.debitsCents))}</p>
                      )}
                      {bucket.creditsCents === 0 && bucket.debitsCents === 0 && (
                        <p className="text-muted-foreground">Internal</p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>How to read this statement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-4">
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                {data.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
              <p className="pt-1 text-xs text-muted-foreground">
                Account {data.user.accountNumber} · Generated {format(new Date(data.generatedAt), "dd MMM yyyy HH:mm")} ·
                Amounts in {data.currency}
              </p>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

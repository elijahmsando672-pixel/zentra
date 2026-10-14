"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ClipboardList, Download, X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { FilterField, FilterSheet } from "@/components/shared/filter-sheet";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { TransactionStatusBadge } from "@/components/shared/status-badge";
import { CopyButton } from "@/components/shared/copy-button";
import { CardSkeleton, EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { TransactionIcon, TransactionTimeline } from "@/components/financial/financial";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApiQuery } from "@/hooks/use-api";
import { getTransactionById, getTransactionCountsByType, getTransactions, transactionsToCsv } from "@/lib/services/records";
import {
  STATUS_META,
  TRANSACTION_TYPE_META,
  WALLET_META,
} from "@/lib/constants";
import type {
  Transaction,
  TransactionFilter,
  TransactionStatus,
  TransactionType,
  WalletType,
} from "@/lib/types";
import { cn, downloadTextFile, formatDateTime, formatKES, relativeTime, toCSV } from "@/lib/utils";
import { toast } from "sonner";

const PAGE_SIZE = 12;
const ALL_TYPES = Object.keys(TRANSACTION_TYPE_META) as TransactionType[];
const ALL_STATUSES = Object.keys(STATUS_META) as TransactionStatus[];
const ALL_WALLETS = Object.keys(WALLET_META) as WalletType[];

function ChipToggle({
  active,
  onClick,
  children,
  ariaLabel,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  ariaLabel: string;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className="gap-1.5"
    >
      {children}
    </Button>
  );
}

export default function RecordsPage() {
  const [search, setSearch] = React.useState("");
  const [types, setTypes] = React.useState<TransactionType[]>([]);
  const [statuses, setStatuses] = React.useState<TransactionStatus[]>([]);
  const [wallets, setWallets] = React.useState<WalletType[]>([]);
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [detailId, setDetailId] = React.useState<string | null>(null);

  const filter: TransactionFilter = React.useMemo(
    () => ({
      ...(types.length ? { types } : {}),
      ...(statuses.length ? { statuses } : {}),
      ...(wallets.length ? { wallets } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(from ? { from: new Date(from).toISOString() } : {}),
      ...(to ? { to: new Date(`${to}T23:59:59.999`).toISOString() } : {}),
      page,
      pageSize: PAGE_SIZE,
    }),
    [types, statuses, wallets, search, from, to, page]
  );

  const filterKey = JSON.stringify(filter);
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useApiQuery(["records", filterKey], () => getTransactions(filter));

  const { data: counts } = useApiQuery(["transaction-counts"], getTransactionCountsByType);

  const { data: detail, isLoading: detailLoading } = useApiQuery(
    ["transaction", detailId ?? ""],
    () => getTransactionById(detailId!),
    { enabled: !!detailId }
  );

  React.useEffect(() => {
    setPage(1);
  }, [search, types, statuses, wallets, from, to]);

  const activeFilterCount =
    (types.length ? 1 : 0) +
    (statuses.length ? 1 : 0) +
    (wallets.length ? 1 : 0) +
    (from || to ? 1 : 0);

  const resetFilters = () => {
    setTypes([]);
    setStatuses([]);
    setWallets([]);
    setFrom("");
    setTo("");
    setSearch("");
  };

  const toggleValue = <T,>(list: T[], value: T, setter: (next: T[]) => void) => {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const handleExport = () => {
    const items = data?.items ?? [];
    if (items.length === 0) {
      toast.error("Nothing to export on this page.");
      return;
    }
    downloadTextFile("zentra-transactions.csv", toCSV(transactionsToCsv(items)));
    toast.success(`Exported ${items.length} transactions`);
  };

  const columns: DataTableColumn<Transaction>[] = [
    {
      key: "reference",
      header: "Reference",
      primary: true,
      render: (t) => <span className="numeric font-semibold">{t.reference}</span>,
    },
    {
      key: "type",
      header: "Type",
      render: (t) => (
        <span className="flex items-center gap-2.5">
          <TransactionIcon type={t.type} className="size-8" />
          <span className="text-sm font-semibold">{TRANSACTION_TYPE_META[t.type].label}</span>
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      className: "max-w-[220px]",
      render: (t) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{t.description}</p>
          {t.counterparty && (
            <p className="truncate text-[11px] text-muted-foreground">{t.counterparty}</p>
          )}
        </div>
      ),
    },
    {
      key: "wallet",
      header: "Wallet",
      hideOnMobile: true,
      render: (t) => <Badge variant="outline">{WALLET_META[t.wallet].shortLabel}</Badge>,
    },
    {
      key: "amount",
      header: "Amount",
      secondary: true,
      className: "text-right",
      render: (t) => (
        <div className="text-right">
          <p
            className={cn(
              "numeric font-extrabold",
              t.direction === "incoming" ? "text-success" : "text-danger"
            )}
          >
            {t.direction === "incoming" ? "+" : "−"}
            {formatKES(t.netAmount)}
          </p>
          {t.fee > 0 && (
            <p className="numeric text-[11px] text-muted-foreground">fee {formatKES(t.fee)}</p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (t) => <TransactionStatusBadge status={t.status} />,
    },
    {
      key: "date",
      header: "Date",
      hideOnMobile: true,
      render: (t) => (
        <div>
          <p className="text-sm">{formatDateTime(t.createdAt)}</p>
          <p className="text-[11px] text-muted-foreground">{relativeTime(t.createdAt)}</p>
        </div>
      ),
    },
  ];

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Records"
        description="Search, filter and export every transaction across your wallets."
        breadcrumbs={[{ label: "Wallet", href: "/wallet" }, { label: "Records" }]}
        actions={
          <>
            <Button variant="outline" onClick={handleExport}>
              <Download />
              Export CSV
            </Button>
            <Button asChild>
              <Link href="/wallet">
                <ClipboardList />
                Wallet overview
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        {counts
          ? (Object.entries(counts) as [TransactionType, number][])
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => {
                const meta = TRANSACTION_TYPE_META[type];
                const Icon = meta.icon;
                const active = types.includes(type);
                return (
                  <ChipToggle
                    key={type}
                    active={active}
                    ariaLabel={`${active ? "Remove" : "Filter by"} ${meta.label} filter`}
                    onClick={() => toggleValue(types, type, setTypes)}
                  >
                    <Icon className="size-3.5" />
                    {meta.label}
                    <span
                      className={cn(
                        "numeric text-xs",
                        active ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}
                    >
                      {count}
                    </span>
                  </ChipToggle>
                );
              })
          : Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 w-24 animate-pulse-soft rounded-full bg-muted" />
            ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search reference, description or counterparty…"
          className="lg:max-w-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          <FilterSheet
            activeCount={activeFilterCount}
            onReset={resetFilters}
            description="Combine type, status and wallet filters."
          >
            <FilterField label="Type">
              <div className="grid gap-2.5">
                {ALL_TYPES.map((type) => (
                  <label
                    key={type}
                    className="flex cursor-pointer items-center gap-2.5 text-sm"
                    htmlFor={`type-${type}`}
                  >
                    <Checkbox
                      id={`type-${type}`}
                      checked={types.includes(type)}
                      onCheckedChange={() => toggleValue(types, type, setTypes)}
                    />
                    {TRANSACTION_TYPE_META[type].label}
                  </label>
                ))}
              </div>
            </FilterField>
            <FilterField label="Status">
              <div className="grid gap-2.5">
                {ALL_STATUSES.map((status) => (
                  <label
                    key={status}
                    className="flex cursor-pointer items-center gap-2.5 text-sm"
                    htmlFor={`status-${status}`}
                  >
                    <Checkbox
                      id={`status-${status}`}
                      checked={statuses.includes(status)}
                      onCheckedChange={() => toggleValue(statuses, status, setStatuses)}
                    />
                    {STATUS_META[status].label}
                  </label>
                ))}
              </div>
            </FilterField>
            <FilterField label="Wallet">
              <div className="grid gap-2.5">
                {ALL_WALLETS.map((wallet) => (
                  <label
                    key={wallet}
                    className="flex cursor-pointer items-center gap-2.5 text-sm"
                    htmlFor={`wallet-${wallet}`}
                  >
                    <Checkbox
                      id={`wallet-${wallet}`}
                      checked={wallets.includes(wallet)}
                      onCheckedChange={() => toggleValue(wallets, wallet, setWallets)}
                    />
                    {WALLET_META[wallet].label}
                  </label>
                ))}
              </div>
            </FilterField>
            <FilterField label="Date range">
              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="date-from" className="text-xs text-muted-foreground">
                    From
                  </Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="date-to" className="text-xs text-muted-foreground">
                    To
                  </Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </div>
              </div>
            </FilterField>
          </FilterSheet>

          {activeFilterCount > 0 && (
            <Button size="sm" variant="ghost" onClick={resetFilters}>
              <X />
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {error ? (
        <ErrorState
          title="Records unavailable"
          description={error.message}
          onRetry={() => void refetch()}
        />
      ) : isLoading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={data?.items ?? []}
            keyExtractor={(t) => t.id}
            onRowClick={(t) => setDetailId(t.id)}
            emptyState={
              <EmptyState
                title="No transactions found"
                description="Adjust your search or filters to see more records."
                action={
                  <Button variant="outline" onClick={resetFilters}>
                    Clear filters
                  </Button>
                }
              />
            }
            mobileCard={(t) => (
              <div
                role="button"
                tabIndex={0}
                onClick={() => setDetailId(t.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setDetailId(t.id);
                  }
                }}
                className="cursor-pointer space-y-3 rounded-lg border border-border bg-card p-4 shadow-xs transition-colors hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <TransactionIcon type={t.type} className="size-9" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        {TRANSACTION_TYPE_META[t.type].label}
                      </p>
                      <p className="numeric truncate text-[11px] text-muted-foreground">
                        {t.reference}
                      </p>
                    </div>
                  </div>
                  <TransactionStatusBadge status={t.status} />
                </div>
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs text-muted-foreground">{t.description}</p>
                    <p className="text-[11px] text-muted-foreground">{formatDateTime(t.createdAt)}</p>
                  </div>
                  <p
                    className={cn(
                      "numeric shrink-0 text-sm font-extrabold",
                      t.direction === "incoming" ? "text-success" : "text-danger"
                    )}
                  >
                    {t.direction === "incoming" ? "+" : "−"}
                    {formatKES(t.netAmount)}
                  </p>
                </div>
              </div>
            )}
          />

          {data && data.total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Showing {data.items.length} of {data.total} transactions
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft />
                  Previous
                </Button>
                <span className="numeric text-xs font-semibold text-muted-foreground">
                  Page {data.page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!data.hasMore}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog
        open={!!detailId}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
      >
        <DialogContent>
          {detailLoading || !detail ? (
            <CardSkeleton lines={6} />
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {TRANSACTION_TYPE_META[detail.type].label}
                  <TransactionStatusBadge status={detail.status} />
                </DialogTitle>
                <DialogDescription>{detail.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3.5">
                  <span className="numeric text-sm font-bold">{detail.reference}</span>
                  <CopyButton value={detail.reference} label="Copy reference" />
                </div>

                <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">Amount</span>
                    <span
                      className={cn(
                        "numeric font-extrabold",
                        detail.direction === "incoming" ? "text-success" : "text-danger"
                      )}
                    >
                      {detail.direction === "incoming" ? "+" : "−"}
                      {formatKES(detail.amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">Fee</span>
                    <span className="numeric font-semibold">{formatKES(detail.fee)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-sm">
                    <span className="font-bold">Net</span>
                    <span className="numeric font-extrabold">{formatKES(detail.netAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">Wallet</span>
                    <span className="font-semibold">{WALLET_META[detail.wallet].label}</span>
                  </div>
                  {detail.counterparty && (
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Counterparty</span>
                      <span className="numeric min-w-0 truncate font-semibold">
                        {detail.counterparty}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-semibold">{formatDateTime(detail.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">Updated</span>
                    <span className="font-semibold">{formatDateTime(detail.updatedAt)}</span>
                  </div>
                </div>

                {detail.events.length > 0 && (
                  <div>
                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Timeline
                    </p>
                    <TransactionTimeline events={detail.events} />
                  </div>
                )}

                <div className="flex justify-between gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const receipt = [
                        "ZENTRA TRANSACTION RECEIPT",
                        `Reference: ${detail.reference}`,
                        `Type: ${TRANSACTION_TYPE_META[detail.type].label}`,
                        `Status: ${STATUS_META[detail.status].label}`,
                        `Amount: ${formatKES(detail.amount)}`,
                        `Fee: ${formatKES(detail.fee)}`,
                        `Net: ${formatKES(detail.netAmount)}`,
                        `Wallet: ${WALLET_META[detail.wallet].label}`,
                        `Counterparty: ${detail.counterparty || "—"}`,
                        `Created: ${formatDateTime(detail.createdAt)}`,
                        `Description: ${detail.description}`,
                      ].join("\n");
                      downloadTextFile(`zentra-receipt-${detail.reference}.txt`, receipt, "text/plain");
                      toast.success("Receipt downloaded.");
                    }}
                  >
                    <Download />
                    Download receipt
                  </Button>
                  <Button variant="outline" onClick={() => setDetailId(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

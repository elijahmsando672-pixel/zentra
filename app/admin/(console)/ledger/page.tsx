"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Landmark,
  Scale,
  XCircle,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApiQuery } from "@/hooks/use-api";
import { getLedger, getLedgerById } from "@/lib/services/admin";
import { TRANSACTION_TYPE_META } from "@/lib/constants";
import { cn, formatDateTime, formatKES } from "@/lib/utils";
import type { LedgerEntry, LedgerJournal, TransactionType } from "@/lib/types";

const TYPE_TONE: Record<TransactionType, string> = {
  deposit: "success",
  withdrawal: "warning",
  investment: "info",
  earning: "success",
  team_reward: "success",
  bonus: "neutral",
  adjustment: "neutral",
  transfer: "neutral",
};

function balanceOf(journal: LedgerJournal) {
  let debits = 0;
  let credits = 0;
  for (const entry of journal.entries) {
    if (entry.direction === "debit") debits += entry.amount;
    else credits += entry.amount;
  }
  return { debits, credits, balanced: Math.abs(debits - credits) < 0.005 };
}

function EntrySummary({ journal }: { journal: LedgerJournal }) {
  const balance = balanceOf(journal);
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`${journal.entries.length} entries`}>
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", balance.balanced ? "bg-success" : "bg-danger")}
      />
      <span className="text-xs">
        {journal.entries.length} {journal.entries.length === 1 ? "entry" : "entries"} ·{" "}
        {balance.balanced ? "balanced" : "imbalance"}
      </span>
    </span>
  );
}

export default function LedgerPage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionType | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debounced, typeFilter, from, to]);

  const { data, isLoading, error, refetch } = useApiQuery(
    ["admin", "ledger", { search: debounced, type: typeFilter, page }],
    () => getLedger({ search: debounced || undefined, type: typeFilter, page })
  );

  const detail = useApiQuery(
    ["admin", "ledger", "detail", selectedId ?? "none"],
    () => getLedgerById(selectedId as string),
    { enabled: !!selectedId }
  );

  const items = useMemo(() => {
    const rows = data?.items ?? [];
    const fromTime = from ? new Date(`${from}T00:00:00`).getTime() : null;
    const toTime = to ? new Date(`${to}T23:59:59.999`).getTime() : null;
    return rows.filter((journal) => {
      const t = new Date(journal.createdAt).getTime();
      if (fromTime !== null && t < fromTime) return false;
      if (toTime !== null && t > toTime) return false;
      return true;
    });
  }, [data, from, to]);

  const stats = useMemo(() => {
    const totalDebited = items.reduce(
      (sum, j) => sum + j.entries.filter((e) => e.direction === "debit").reduce((s, e) => s + e.amount, 0),
      0
    );
    const totalCredited = items.reduce(
      (sum, j) => sum + j.entries.filter((e) => e.direction === "credit").reduce((s, e) => s + e.amount, 0),
      0
    );
    const imbalances = items.filter((j) => !balanceOf(j).balanced).length;
    return { totalDebited, totalCredited, imbalances };
  }, [items]);

  const pageSize = data?.pageSize ?? 12;
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  const columns: DataTableColumn<LedgerJournal>[] = [
    {
      key: "reference",
      header: "Reference",
      primary: true,
      render: (journal) => (
        <span className="numeric inline-flex items-center gap-1 font-bold">
          {journal.reference}
          <CopyButton value={journal.reference} label={`Copy ${journal.reference}`} size="icon-sm" />
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (journal) => (
        <span className="inline-flex items-center gap-1.5">
          <StatusBadge
            status={journal.type}
            meta={{ label: TRANSACTION_TYPE_META[journal.type].label, tone: TYPE_TONE[journal.type] }}
          />
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      secondary: true,
      render: (journal) => <span className="line-clamp-1 max-w-[260px]">{journal.description}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      render: (journal) => (
        <span className="numeric block text-right font-extrabold">{formatKES(journal.totalAmount)}</span>
      ),
      className: "text-right",
    },
    {
      key: "userAccountNumber",
      header: "Account",
      hideOnMobile: true,
      render: (journal) => (
        <span className="numeric text-muted-foreground">{journal.userAccountNumber ?? "—"}</span>
      ),
    },
    {
      key: "actor",
      header: "Actor",
      hideOnMobile: true,
      render: (journal) => <span className="text-muted-foreground">{journal.actor}</span>,
    },
    {
      key: "entries",
      header: "Entries",
      hideOnMobile: true,
      render: (journal) => <EntrySummary journal={journal} />,
    },
    {
      key: "createdAt",
      header: "Created",
      render: (journal) => (
        <span className="text-muted-foreground whitespace-nowrap">{formatDateTime(journal.createdAt)}</span>
      ),
    },
  ];

  const selected = detail.data;
  const selectedBalance = selected ? balanceOf(selected) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ledger"
        description="Double-entry journal of account movements. Every mutation posts balanced debits and credits."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Ledger" }]}
        actions={<DemoDataBadge />}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Journals"
          value={isLoading ? undefined : String(data?.total ?? 0)}
          icon={<Landmark className="size-5" />}
          supporting="Matching filter"
          loading={isLoading}
        />
        <StatCard
          label="Total debited"
          value={isLoading ? undefined : formatKES(stats.totalDebited, { decimals: 0 })}
          icon={<Scale className="size-5" />}
          supporting="Current view"
          loading={isLoading}
        />
        <StatCard
          label="Total credited"
          value={isLoading ? undefined : formatKES(stats.totalCredited, { decimals: 0 })}
          icon={<CheckCircle2 className="size-5" />}
          supporting="Current view"
          loading={isLoading}
        />
        <StatCard
          label="Imbalances"
          value={isLoading ? undefined : String(stats.imbalances)}
          icon={<AlertTriangle className="size-5" />}
          supporting={stats.imbalances === 0 ? "All journals balance" : "Current view"}
          loading={isLoading}
          className={stats.imbalances > 0 ? "border-t-2 border-danger" : "border-t-2 border-success"}
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search reference or description…"
          className="lg:max-w-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TransactionType | "all")}>
            <SelectTrigger className="w-[170px]" aria-label="Filter by transaction type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {(Object.entries(TRANSACTION_TYPE_META) as [TransactionType, { label: string }][]).map(
                ([key, meta]) => (
                  <SelectItem key={key} value={key}>
                    {meta.label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-[150px]"
            aria-label="From date"
          />
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-[150px]"
            aria-label="To date"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground" aria-live="polite">
        {isLoading ? (
          "Loading journals…"
        ) : (
          <>
            <span className="numeric font-semibold text-foreground">{data?.total ?? 0}</span> journals
            matching your filters
            {data && data.total > pageSize
              ? ` (page ${data.page} of ${Math.ceil(data.total / data.pageSize)})`
              : ""}
          </>
        )}
      </p>

      {isLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : error ? (
        <ErrorState
          title="Could not load the ledger"
          description={error.message}
          onRetry={() => void refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="No journals found"
          description="No ledger entries match the current filters. Try widening the date range or clearing the search."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setDebounced("");
                setTypeFilter("all");
                setFrom("");
                setTo("");
              }}
            >
              Reset filters
            </Button>
          }
        />
      ) : (
        <>
          <DataTable<LedgerJournal>
            columns={columns}
            rows={items}
            keyExtractor={(journal) => journal.id}
            onRowClick={(journal) => setSelectedId(journal.id)}
            emptyState={
              <EmptyState
                title="Nothing to display"
                description="No journals matched the active filters."
              />
            }
          />
          <div className="flex items-center justify-between gap-3" aria-label="Pagination">
            <p className="numeric text-xs text-muted-foreground">
              Page {data?.page ?? 1} of {totalPages}
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
                disabled={!data?.hasMore}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Next page"
              >
                Next
                <ChevronRight />
              </Button>
            </div>
          </div>
        </>
      )}

      <Dialog open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-2xl" aria-describedby="ledger-detail-description">
          <DialogHeader>
            <DialogTitle>Journal detail</DialogTitle>
            <DialogDescription id="ledger-detail-description">
              {selected?.reference ?? "Loading ledger entry…"}
            </DialogDescription>
          </DialogHeader>

          {!selectedId ? null : detail.isLoading ? (
            <CardSkeleton lines={5} />
          ) : detail.error ? (
            <ErrorState
              title="Could not load journal"
              description={detail.error.message}
              onRetry={() => void detail.refetch()}
            />
          ) : selected && selectedBalance ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="numeric border-border font-bold">
                  {selected.reference}
                </Badge>
                <StatusBadge
                  status={selected.type}
                  meta={{ label: TRANSACTION_TYPE_META[selected.type].label, tone: TYPE_TONE[selected.type] }}
                />
                <Badge variant="secondary" className="numeric">
                  {formatKES(selected.totalAmount)}
                </Badge>
              </div>

              {selectedBalance.balanced ? (
                <Alert variant="success">
                  <CheckCircle2 />
                  <AlertTitle>Journal balances</AlertTitle>
                  <AlertDescription>
                    Debits equal credits (KES{" "}
                    {selectedBalance.debits.toLocaleString(undefined, { maximumFractionDigits: 2 })}).
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="danger">
                  <XCircle />
                  <AlertTitle>Imbalance detected</AlertTitle>
                  <AlertDescription>
                    Debits and credits differ by{" "}
                    {formatKES(Math.abs(selectedBalance.debits - selectedBalance.credits))}.
                  </AlertDescription>
                </Alert>
              )}

              <div className="rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Account</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selected.entries.map((entry: LedgerEntry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-semibold">{entry.account}</TableCell>
                        <TableCell className="numeric text-muted-foreground">{entry.accountCode}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "border-transparent",
                              entry.direction === "debit"
                                ? "bg-info-soft text-info"
                                : "bg-gold-soft text-gold-foreground"
                            )}
                          >
                            {entry.direction === "debit" ? "Debit" : "Credit"}
                          </Badge>
                        </TableCell>
                        <TableCell className="numeric text-right font-bold">
                          {formatKES(entry.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Alert>
                <AlertTitle>Immutable record</AlertTitle>
                <AlertDescription>
                  Ledger entries are immutable in this system. Corrections require a reversing journal,
                  The reversing-journal workflow is not available here.
                </AlertDescription>
              </Alert>

              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                {[
                  { label: "Actor", value: selected.actor },
                  { label: "Account", value: selected.userAccountNumber ?? "—" },
                  { label: "Created", value: formatDateTime(selected.createdAt) },
                  { label: "Journal ID", value: selected.id },
                  { label: "Type", value: TRANSACTION_TYPE_META[selected.type].label },
                  { label: "Immutable", value: selected.immutable ? "Yes" : "No" },
                ].map((item) => (
                  <div key={item.label}>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {item.label}
                    </dt>
                    <dd className="numeric mt-0.5 font-bold">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

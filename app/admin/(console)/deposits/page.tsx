"use client";

import * as React from "react";
import { toast } from "sonner";
import { ArrowDownLeft, Eye, FileCheck2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { CopyButton } from "@/components/shared/copy-button";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { TransactionTimeline } from "@/components/financial/financial";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApiQuery } from "@/hooks/use-api";
import { getAdminDashboard, getAdminDeposits, markDepositReviewed, reviewDepositPayment } from "@/lib/services/admin";
import { formatCompactKES, formatDateTime, formatKES, maskPhone, relativeTime } from "@/lib/utils";
import type { Deposit, DepositStatus } from "@/lib/types";

const PAGE_SIZE = 10;

const DEPOSIT_STATUS_META: Record<string, { label: string; tone: string }> = {
  initiated: { label: "Initiated", tone: "info" },
  pending: { label: "Pending", tone: "warning" },
  completed: { label: "Completed", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

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
        Showing {from}–{to} of {total} deposits
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

export default function AdminDepositsPage() {
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [status, setStatus] = React.useState<DepositStatus | "all">("all");
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<Deposit | null>(null);
  const [note, setNote] = React.useState("");
  const [noteError, setNoteError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  React.useEffect(() => {
    setPage(1);
  }, [debounced, status]);

  const dashboard = useApiQuery(["admin", "deposits", "stats"], getAdminDashboard);
  const failedCount = useApiQuery(["admin", "deposits", "failed-count"], () =>
    getAdminDeposits({ status: "failed" })
  );
  const deposits = useApiQuery(
    ["admin", "deposits", "list", debounced, status, page],
    () => getAdminDeposits({ search: debounced || undefined, status, page })
  );

  const openReview = (deposit: Deposit) => {
    setSelected(deposit);
    setNote("");
    setNoteError("");
  };

  const submitReview = async () => {
    if (!selected) return;
    if (!note.trim()) {
      setNoteError("A review note is required.");
      return;
    }
    setSubmitting(true);
    const res = await markDepositReviewed(selected.id, note.trim());
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success(`Deposit ${selected.reference} marked as reviewed`);
    setSelected(null);
    setNote("");
  };

  const submitDecision = async (decision: "confirm" | "reject") => {
    if (!selected) return;
    if (!note.trim()) {
      setNoteError("A note is required to record this decision.");
      return;
    }
    setSubmitting(true);
    const res = await reviewDepositPayment(selected.id, decision, note.trim());
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success(
      decision === "confirm"
        ? `Deposit ${selected.reference} confirmed and credited`
        : `Deposit ${selected.reference} rejected`
    );
    void deposits.refetch();
    setSelected(null);
    setNote("");
  };

  const awaitingVerification = (row: Deposit) => row.status === "pending" && row.method === "paypal";

  const columns: DataTableColumn<Deposit>[] = [
    {
      key: "reference",
      header: "Reference",
      primary: true,
      render: (row) => (
        <div className="min-w-0">
          <p className="numeric truncate text-sm font-bold">{row.reference}</p>
          <p className="truncate text-xs text-muted-foreground">{relativeTime(row.createdAt)}</p>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Member phone",
      secondary: true,
      render: (row) => <span className="numeric text-xs">{maskPhone(row.phone)}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      render: (row) => (
        <span className="numeric text-sm font-extrabold">{formatKES(row.amount, { decimals: 0 })}</span>
      ),
    },
    {
      key: "method",
      header: "Method",
      hideOnMobile: true,
      render: (row) => (
        <Badge variant="outline">{row.method === "paypal" ? "PayPal" : "M-Pesa STK"}</Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} meta={DEPOSIT_STATUS_META[row.status]} />,
    },
    {
      key: "created",
      header: "Created",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground" title={formatDateTime(row.createdAt)}>
          {formatDateTime(row.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={() => openReview(row)} aria-label={`Review ${row.reference}`}>
            <Eye />
            Review
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deposits"
        description="M-Pesa STK deposit queue: monitor callbacks and record manual reviews."
        actions={<DemoDataBadge />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pending review"
          value={dashboard.data?.pendingDeposits ?? 0}
          loading={dashboard.isLoading}
          icon={<ArrowDownLeft className="size-5" />}
          supporting="Awaiting callback confirmation"
        />
        <StatCard
          label="Failed deposits"
          value={failedCount.data?.total ?? 0}
          loading={failedCount.isLoading}
          icon={<ArrowDownLeft className="size-5" />}
          supporting="Callback reported failure"
        />
        <StatCard
          label="Volume today"
          value={formatCompactKES(dashboard.data?.depositsToday ?? 0)}
          loading={dashboard.isLoading}
          icon={<ArrowDownLeft className="size-5" />}
          supporting="Completed since midnight"
        />
        <StatCard
          label="Completed volume"
          value={formatCompactKES(dashboard.data?.totalDeposits ?? 0)}
          loading={dashboard.isLoading}
          icon={<ArrowDownLeft className="size-5" />}
          supporting="All-time credited deposits"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search reference, phone or checkout ID"
          className="sm:max-w-sm sm:flex-1"
        />
        <Select value={status} onValueChange={(v) => setStatus(v as DepositStatus | "all")}>
          <SelectTrigger className="w-[170px]" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="initiated">Initiated</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {deposits.isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : deposits.error ? (
        <ErrorState
          title="Could not load deposits"
          description={deposits.error.message}
          onRetry={() => void deposits.refetch()}
        />
      ) : deposits.data && deposits.data.items.length > 0 ? (
        <div className="space-y-4">
          <DataTable
            columns={columns}
            rows={deposits.data.items}
            keyExtractor={(row) => row.id}
            onRowClick={(row) => openReview(row)}
          />
          <Pager page={deposits.data.page} total={deposits.data.total} pageSize={PAGE_SIZE} onPage={setPage} />
        </div>
      ) : (
        <EmptyState
          title="No deposits found"
          description="No deposits match the current search and status filter."
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

      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open && !submitting) {
            setSelected(null);
            setNote("");
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  Deposit review
                  <StatusBadge status={selected.status} meta={DEPOSIT_STATUS_META[selected.status]} />
                </DialogTitle>
                <DialogDescription>
                  {awaitingVerification(selected)
                    ? "Verify the PayPal payment against its reference before crediting the member's wallet."
                    : "Verify the STK transaction before recording a manual review."}
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-center gap-2">
                <span className="numeric text-sm font-extrabold">{selected.reference}</span>
                <CopyButton value={selected.reference} label="Copy reference" />
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                <InfoField label="Amount">
                  <span className="numeric">{formatKES(selected.amount)}</span>
                </InfoField>
                <InfoField label="Fee">
                  <span className="numeric">{formatKES(selected.fee)}</span>
                </InfoField>
                <InfoField label="Phone">
                  <span className="numeric">{selected.phone}</span>
                </InfoField>
                <InfoField label="Wallet">
                  <span className="capitalize">{selected.wallet.replace("_", " ")}</span>
                </InfoField>
                <InfoField label="Checkout request ID">
                  <span className="numeric text-xs">{selected.checkoutRequestId}</span>
                </InfoField>
                <InfoField label="Merchant request ID">
                  <span className="numeric text-xs">{selected.merchantRequestId}</span>
                </InfoField>
                <InfoField label="Created">{formatDateTime(selected.createdAt)}</InfoField>
                <InfoField label="Completed">
                  {selected.completedAt ? formatDateTime(selected.completedAt) : "Not completed"}
                </InfoField>
              </dl>

              {selected.method === "paypal" && (
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    PayPal reference
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="numeric text-sm font-semibold break-all">
                      {selected.providerReference || "—"}
                    </span>
                    {selected.providerReference && (
                      <CopyButton value={selected.providerReference} label="Copy reference" />
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    Match this reference against the payment in the PayPal account before confirming.
                  </p>
                </div>
              )}

              {selected.failureReason && (
                <div className="rounded-lg border border-danger/30 bg-danger-soft p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-danger">Failure reason</p>
                  <p className="mt-1 text-xs leading-relaxed">{selected.failureReason}</p>
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Transaction events
                </p>
                <TransactionTimeline events={selected.events} />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="deposit-note">Review note</Label>
                <Textarea
                  id="deposit-note"
                  value={note}
                  onChange={(e) => {
                    setNote(e.target.value);
                    if (e.target.value.trim()) setNoteError("");
                  }}
                  placeholder="What did you verify for this deposit?"
                  aria-invalid={!!noteError}
                />
                {noteError && (
                  <p role="alert" className="text-xs font-semibold text-danger">
                    {noteError}
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelected(null);
                    setNote("");
                  }}
                  disabled={submitting}
                >
                  {awaitingVerification(selected) ? "Close" : "Cancel"}
                </Button>
                {awaitingVerification(selected) ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => void submitDecision("reject")}
                      disabled={submitting}
                    >
                      Reject payment
                    </Button>
                    <Button onClick={() => void submitDecision("confirm")} disabled={submitting}>
                      <FileCheck2 />
                      {submitting ? "Confirming…" : "Confirm payment"}
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => void submitReview()} disabled={submitting}>
                    <FileCheck2 />
                    {submitting ? "Saving…" : "Mark reviewed"}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

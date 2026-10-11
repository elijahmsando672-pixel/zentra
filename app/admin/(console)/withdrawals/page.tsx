"use client";

import * as React from "react";
import { toast } from "sonner";
import { ArrowUpRight, Ban, CheckCircle2, Eye } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { CopyButton } from "@/components/shared/copy-button";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { TransactionTimeline } from "@/components/financial/financial";
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
import { getAdminDashboard, getAdminWithdrawals, reviewWithdrawal } from "@/lib/services/admin";
import { formatCompactKES, formatDateTime, formatKES, maskPhone, relativeTime } from "@/lib/utils";
import type { Withdrawal, WithdrawalStatus } from "@/lib/types";

const PAGE_SIZE = 10;

const WITHDRAWAL_STATUS_META: Record<string, { label: string; tone: string }> = {
  pending_approval: { label: "Pending approval", tone: "warning" },
  approved: { label: "Approved", tone: "info" },
  processing: { label: "Processing", tone: "info" },
  paid: { label: "Paid", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  failed: { label: "Failed", tone: "danger" },
};

const RISK_META: Record<string, { label: string; tone: string }> = {
  low: { label: "Low", tone: "success" },
  medium: { label: "Medium", tone: "warning" },
  high: { label: "High", tone: "danger" },
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
        Showing {from}–{to} of {total} withdrawals
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

export default function AdminWithdrawalsPage() {
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [status, setStatus] = React.useState<WithdrawalStatus | "all">("all");
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<Withdrawal | null>(null);
  const [note, setNote] = React.useState("");
  const [noteError, setNoteError] = React.useState("");
  const [pending, setPending] = React.useState<"approve" | "reject" | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  React.useEffect(() => {
    setPage(1);
  }, [debounced, status]);

  const dashboard = useApiQuery(["admin", "withdrawals", "stats"], getAdminDashboard);
  const paidCount = useApiQuery(["admin", "withdrawals", "paid-count"], () =>
    getAdminWithdrawals({ status: "paid" })
  );
  const withdrawals = useApiQuery(
    ["admin", "withdrawals", "list", debounced, status, page],
    () => getAdminWithdrawals({ search: debounced || undefined, status, page })
  );

  const openReview = (withdrawal: Withdrawal) => {
    setSelected(withdrawal);
    setNote("");
    setNoteError("");
  };

  const submitDecision = async (decision: "approve" | "reject") => {
    if (!selected) return;
    if (decision === "reject" && !note.trim()) {
      setNoteError("A reason is required to reject a withdrawal.");
      return;
    }
    setPending(decision);
    const res = await reviewWithdrawal(selected.id, decision, note.trim() || undefined);
    setPending(null);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success(
      decision === "approve"
        ? `Withdrawal ${selected.reference} approved and marked paid`
        : `Withdrawal ${selected.reference} rejected`
    );
    setSelected(null);
    setNote("");
  };

  const columns: DataTableColumn<Withdrawal>[] = [
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
      key: "account",
      header: "Account",
      secondary: true,
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{row.user?.fullName ?? "Unknown member"}</p>
          <p className="numeric truncate text-xs text-muted-foreground">
            {row.user?.accountNumber ?? "—"}
          </p>
        </div>
      ),
    },
    {
      key: "gross",
      header: "Gross",
      render: (row) => (
        <span className="numeric text-sm font-extrabold">{formatKES(row.amount, { decimals: 0 })}</span>
      ),
    },
    {
      key: "fee",
      header: "Fee",
      hideOnMobile: true,
      render: (row) => <span className="numeric text-xs text-muted-foreground">{formatKES(row.fee)}</span>,
    },
    {
      key: "net",
      header: "Net",
      hideOnMobile: true,
      render: (row) => <span className="numeric text-xs font-bold">{formatKES(row.netAmount)}</span>,
    },
    {
      key: "payout",
      header: "Payout account",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-bold">{row.payoutAccount.nickname}</p>
          <p className="numeric truncate text-[11px] text-muted-foreground">
            {maskPhone(row.payoutAccount.phone)}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} meta={WITHDRAWAL_STATUS_META[row.status]} />,
    },
    {
      key: "requested",
      header: "Requested",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground" title={formatDateTime(row.createdAt)}>
          {relativeTime(row.createdAt)}
        </span>
      ),
    },
    {
      key: "risk",
      header: "Risk",
      render: (row) => (
        <div className="space-y-1">
          <StatusBadge status={row.riskLevel} meta={RISK_META[row.riskLevel]} />
          <p className="numeric text-[10px] text-muted-foreground">score {row.riskScore}</p>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openReview(row)}
            aria-label={`Review withdrawal ${row.reference}`}
          >
            {row.status === "pending_approval" ? (
              <>
                <Eye />
                Review
              </>
            ) : (
              <>
                <Eye />
                View
              </>
            )}
          </Button>
        </div>
      ),
    },
  ];

  const isPendingReview = selected?.status === "pending_approval";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Withdrawals"
        description="Review payout requests, apply decisions, and track disbursements."
        actions={<DemoDataBadge />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pending review"
          value={dashboard.data?.pendingWithdrawals ?? 0}
          loading={dashboard.isLoading}
          icon={<ArrowUpRight className="size-5" />}
          supporting="Awaiting dual approval"
        />
        <StatCard
          label="Approved payouts"
          value={paidCount.data?.total ?? 0}
          loading={paidCount.isLoading}
          icon={<CheckCircle2 className="size-5" />}
          supporting="Completed disbursements"
        />
        <StatCard
          label="Rejected or failed"
          value={dashboard.data?.failedWithdrawals ?? 0}
          loading={dashboard.isLoading}
          icon={<Ban className="size-5" />}
          supporting="Requires member follow-up"
        />
        <StatCard
          label="Paid volume"
          value={formatCompactKES(dashboard.data?.totalWithdrawals ?? 0)}
          loading={dashboard.isLoading}
          icon={<ArrowUpRight className="size-5" />}
          supporting="All-time disbursed"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search reference, member or account"
          className="sm:max-w-sm sm:flex-1"
        />
        <Select value={status} onValueChange={(v) => setStatus(v as WithdrawalStatus | "all")}>
          <SelectTrigger className="w-[190px]" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending_approval">Pending approval</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {withdrawals.isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : withdrawals.error ? (
        <ErrorState
          title="Could not load withdrawals"
          description={withdrawals.error.message}
          onRetry={() => void withdrawals.refetch()}
        />
      ) : withdrawals.data && withdrawals.data.items.length > 0 ? (
        <div className="space-y-4">
          <DataTable
            columns={columns}
            rows={withdrawals.data.items}
            keyExtractor={(row) => row.id}
            onRowClick={(row) => openReview(row)}
          />
          <Pager
            page={withdrawals.data.page}
            total={withdrawals.data.total}
            pageSize={PAGE_SIZE}
            onPage={setPage}
          />
        </div>
      ) : (
        <EmptyState
          title="No withdrawals found"
          description="No payout requests match the current search and status filter."
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
          if (!open && !pending) {
            setSelected(null);
            setNote("");
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-3">
                  Withdrawal review
                  <StatusBadge status={selected.status} meta={WITHDRAWAL_STATUS_META[selected.status]} />
                </DialogTitle>
                <DialogDescription>
                  {isPendingReview
                    ? "Verify the payout details before approving or rejecting this request."
                    : "This request has already been decided and is shown for reference."}
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-center gap-2">
                <span className="numeric text-sm font-extrabold">{selected.reference}</span>
                <CopyButton value={selected.reference} label="Copy reference" />
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                <InfoField label="Member">
                  {selected.user?.fullName ?? "Unknown member"}
                  <span className="numeric block text-xs font-normal text-muted-foreground">
                    {selected.user?.accountNumber ?? "—"}
                  </span>
                </InfoField>
                <InfoField label="Beneficiary">{selected.payoutAccount.nickname}</InfoField>
                <InfoField label="Payout phone">
                  <span className="numeric">{selected.payoutAccount.phone}</span>
                </InfoField>
                <InfoField label="Source wallet">
                  <span className="capitalize">{selected.wallet.replace("_", " ")}</span>
                </InfoField>
                <InfoField label="Gross amount">
                  <span className="numeric">{formatKES(selected.amount)}</span>
                </InfoField>
                <InfoField label="Fee">
                  <span className="numeric">{formatKES(selected.fee)}</span>
                </InfoField>
                <InfoField label="Net payout">
                  <span className="numeric text-success">{formatKES(selected.netAmount)}</span>
                </InfoField>
                <InfoField label="Requested">{formatDateTime(selected.createdAt)}</InfoField>
                <InfoField label="Risk">
                  <StatusBadge status={selected.riskLevel} meta={RISK_META[selected.riskLevel]} />
                  <span className="numeric ml-2 text-xs text-muted-foreground">score {selected.riskScore}</span>
                </InfoField>
                <InfoField label="Controls">
                  <span className="text-xs">
                    PIN {selected.pinVerified ? "verified" : "not verified"} · OTP{" "}
                    {selected.otpVerified ? "verified" : "not verified"}
                  </span>
                </InfoField>
              </dl>

              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Approval trail
                </p>
                <ul className="space-y-2">
                  {selected.approvals.map((approval) => (
                    <li
                      key={approval.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold">
                          Step {approval.step} · {approval.approver}
                          <span className="ml-1 font-normal text-muted-foreground">({approval.role})</span>
                        </p>
                        {approval.reason && (
                          <p className="truncate text-[11px] text-muted-foreground">{approval.reason}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge
                          status={approval.action}
                          meta={
                            approval.action === "approved"
                              ? { label: "Approved", tone: "success" }
                              : approval.action === "rejected"
                                ? { label: "Rejected", tone: "danger" }
                                : { label: "Pending", tone: "warning" }
                          }
                        />
                        {approval.at && (
                          <span className="text-[10px] text-muted-foreground">{formatDateTime(approval.at)}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {selected.rejectionReason && (
                <div className="rounded-lg border border-danger/30 bg-danger-soft p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-danger">Rejection reason</p>
                  <p className="mt-1 text-xs leading-relaxed">{selected.rejectionReason}</p>
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Payout events
                </p>
                <TransactionTimeline events={selected.events} />
              </div>

              {isPendingReview ? (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="withdrawal-note">Decision note</Label>
                    <Textarea
                      id="withdrawal-note"
                      value={note}
                      onChange={(e) => {
                        setNote(e.target.value);
                        if (e.target.value.trim()) setNoteError("");
                      }}
                      placeholder="Optional for approval, required to reject…"
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
                      disabled={!!pending}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => void submitDecision("reject")}
                      disabled={!!pending}
                    >
                      <Ban />
                      {pending === "reject" ? "Rejecting…" : "Reject"}
                    </Button>
                    <Button
                      variant="success"
                      onClick={() => void submitDecision("approve")}
                      disabled={!!pending}
                    >
                      <CheckCircle2 />
                      {pending === "approve" ? "Approving…" : "Approve"}
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSelected(null)}>
                    Close
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

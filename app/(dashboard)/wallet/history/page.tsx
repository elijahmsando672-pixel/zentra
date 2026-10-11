"use client";

import * as React from "react";
import { Download, Eye } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { CardSkeleton, EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { TransactionTimeline } from "@/components/financial/financial";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApiQuery } from "@/hooks/use-api";
import { cancelDeposit, getDeposits } from "@/lib/services/deposits";
import { cancelWithdrawal, getWithdrawals } from "@/lib/services/withdrawals";
import { WALLET_META } from "@/lib/constants";
import type { Deposit, DepositStatus, Withdrawal, WithdrawalStatus } from "@/lib/types";
import {
  downloadTextFile,
  formatDateTime,
  formatKES,
  formatPhoneKE,
  maskPhone,
  relativeTime,
  toCSV,
} from "@/lib/utils";
import { toast } from "sonner";

const DEPOSIT_STATUS_META: Record<DepositStatus, { label: string; tone: string }> = {
  initiated: { label: "Initiated", tone: "info" },
  pending: { label: "Pending", tone: "warning" },
  completed: { label: "Completed", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

const WITHDRAWAL_STATUS_META: Record<WithdrawalStatus, { label: string; tone: string }> = {
  pending_approval: { label: "Pending approval", tone: "warning" },
  approved: { label: "Approved", tone: "info" },
  processing: { label: "Processing", tone: "info" },
  paid: { label: "Paid", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  failed: { label: "Failed", tone: "danger" },
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="numeric min-w-0 truncate font-semibold">{value}</span>
    </div>
  );
}

export default function WalletHistoryPage() {
  const { data: deposits, isLoading: depositsLoading, error: depositsError, refetch: refetchDeposits } =
    useApiQuery(["deposits"], () => getDeposits(50), { refetchInterval: 6000 });
  const {
    data: withdrawals,
    isLoading: withdrawalsLoading,
    error: withdrawalsError,
    refetch: refetchWithdrawals,
  } = useApiQuery(["withdrawals"], getWithdrawals, { refetchInterval: 8000 });

  const [search, setSearch] = React.useState("");
  const [depositStatus, setDepositStatus] = React.useState<string>("all");
  const [withdrawalStatus, setWithdrawalStatus] = React.useState<string>("all");
  const [depositDetailId, setDepositDetailId] = React.useState<string | null>(null);
  const [withdrawalDetailId, setWithdrawalDetailId] = React.useState<string | null>(null);
  const [cancellingId, setCancellingId] = React.useState<string | null>(null);

  const query = search.trim().toLowerCase();

  const filteredDeposits = (deposits ?? []).filter((d) => {
    if (depositStatus !== "all" && d.status !== depositStatus) return false;
    if (
      query &&
      !`${d.reference} ${d.phone} ${d.method} ${d.providerReference ?? ""}`
        .toLowerCase()
        .includes(query)
    ) {
      return false;
    }
    return true;
  });

  const filteredWithdrawals = (withdrawals ?? []).filter((w) => {
    if (withdrawalStatus !== "all" && w.status !== withdrawalStatus) return false;
    if (
      query &&
      !`${w.reference} ${w.payoutAccount.nickname} ${w.payoutAccount.phone}`.toLowerCase().includes(query)
    )
      return false;
    return true;
  });

  const selectedDeposit = deposits?.find((d) => d.id === depositDetailId) ?? null;
  const selectedWithdrawal = withdrawals?.find((w) => w.id === withdrawalDetailId) ?? null;

  const handleCancelDeposit = async (id: string) => {
    setCancellingId(id);
    const res = await cancelDeposit(id);
    setCancellingId(null);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success("Deposit cancelled");
    void refetchDeposits();
  };

  const handleCancelWithdrawal = async (id: string) => {
    setCancellingId(id);
    const res = await cancelWithdrawal(id);
    setCancellingId(null);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success("Withdrawal cancelled and funds returned");
    void refetchWithdrawals();
  };

  const exportDeposits = () => {
    const rows = (deposits ?? []).map((d) => ({
      Reference: d.reference,
      Method: d.method === "paypal" ? "PayPal" : "M-Pesa",
      "Provider reference": d.providerReference ?? "",
      Amount: d.amount,
      Fee: d.fee,
      Phone: d.phone,
      Status: d.status,
      Wallet: d.wallet,
      Created: d.createdAt,
      Completed: d.completedAt ?? "",
      Failure: d.failureReason ?? "",
    }));
    downloadTextFile("zentra-deposits.csv", toCSV(rows));
    toast.success("Deposit history exported");
  };

  const exportWithdrawals = () => {
    const rows = (withdrawals ?? []).map((w) => ({
      Reference: w.reference,
      Amount: w.amount,
      Fee: w.fee,
      Net: w.netAmount,
      Wallet: w.wallet,
      Payout: `${w.payoutAccount.nickname} ${w.payoutAccount.phone}`,
      Status: w.status,
      Created: w.createdAt,
      Paid: w.paidAt ?? "",
    }));
    downloadTextFile("zentra-withdrawals.csv", toCSV(rows));
    toast.success("Withdrawal history exported");
  };

  const depositActions = (d: Deposit) => (
    <div className="flex items-center justify-end gap-1.5">
      <Button size="sm" variant="ghost" onClick={() => setDepositDetailId(d.id)}>
        <Eye />
        View
      </Button>
      {d.status === "pending" && (
        <Button
          size="sm"
          variant="outline"
          className="text-danger"
          disabled={cancellingId === d.id}
          onClick={() => void handleCancelDeposit(d.id)}
        >
          {cancellingId === d.id ? "Cancelling…" : "Cancel"}
        </Button>
      )}
    </div>
  );

  const withdrawalActions = (w: Withdrawal) => (
    <div className="flex items-center justify-end gap-1.5">
      <Button size="sm" variant="ghost" onClick={() => setWithdrawalDetailId(w.id)}>
        <Eye />
        View
      </Button>
      {w.status === "pending_approval" && (
        <Button
          size="sm"
          variant="outline"
          className="text-danger"
          disabled={cancellingId === w.id}
          onClick={() => void handleCancelWithdrawal(w.id)}
        >
          {cancellingId === w.id ? "Cancelling…" : "Cancel"}
        </Button>
      )}
    </div>
  );

  const depositColumns: DataTableColumn<Deposit>[] = [
    {
      key: "reference",
      header: "Reference",
      primary: true,
      render: (d) => <span className="numeric font-semibold">{d.reference}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      secondary: true,
      render: (d) => (
        <div>
          <p className="numeric font-bold">{formatKES(d.amount)}</p>
          <p className="text-[11px] text-muted-foreground">Fee {formatKES(d.fee)}</p>
        </div>
      ),
    },
    {
      key: "method",
      header: "Method",
      render: (d) => (
        <div className="space-y-1">
          <Badge variant="outline">{d.method === "paypal" ? "PayPal" : "M-Pesa"}</Badge>
          {d.method === "paypal" && d.providerReference && (
            <p className="numeric max-w-40 truncate text-[11px] text-muted-foreground" title={d.providerReference}>
              Ref {d.providerReference}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      hideOnMobile: true,
      render: (d) => <span className="numeric text-sm">{maskPhone(d.phone)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (d) => <StatusBadge status={d.status} meta={DEPOSIT_STATUS_META[d.status]} />,
    },
    {
      key: "created",
      header: "Created",
      hideOnMobile: true,
      render: (d) => (
        <div>
          <p className="text-sm">{formatDateTime(d.createdAt)}</p>
          <p className="text-[11px] text-muted-foreground">{relativeTime(d.createdAt)}</p>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-0",
      className: "text-right",
      render: (d) => depositActions(d),
    },
  ];

  const withdrawalColumns: DataTableColumn<Withdrawal>[] = [
    {
      key: "reference",
      header: "Reference",
      primary: true,
      render: (w) => <span className="numeric font-semibold">{w.reference}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      secondary: true,
      render: (w) => (
        <div>
          <p className="numeric font-bold">{formatKES(w.amount)}</p>
          <p className="text-[11px] text-muted-foreground">
            Fee {formatKES(w.fee)} · Net {formatKES(w.netAmount)}
          </p>
        </div>
      ),
    },
    {
      key: "payout",
      header: "Payout",
      render: (w) => (
        <div>
          <p className="text-sm font-semibold">{w.payoutAccount.nickname}</p>
          <p className="numeric text-[11px] text-muted-foreground">{maskPhone(w.payoutAccount.phone)}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (w) => <StatusBadge status={w.status} meta={WITHDRAWAL_STATUS_META[w.status]} />,
    },
    {
      key: "created",
      header: "Created",
      render: (w) => (
        <div>
          <p className="text-sm">{formatDateTime(w.createdAt)}</p>
          <p className="text-[11px] text-muted-foreground">{relativeTime(w.createdAt)}</p>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-0",
      className: "text-right",
      render: (w) => withdrawalActions(w),
    },
  ];

  const toolbar = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search reference or phone…"
        className="sm:max-w-xs"
      />
      <p className="text-xs text-muted-foreground">
        {filteredDeposits.length + filteredWithdrawals.length} matching records
      </p>
    </div>
  );

  const statusSelect = (
    value: string,
    onChange: (v: string) => void,
    meta: Record<string, { label: string }>,
    allLabel: string,
    ariaLabel: string
  ) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="w-[190px]" aria-label={ariaLabel}>
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {Object.entries(meta).map(([key, item]) => (
          <SelectItem key={key} value={key}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wallet history"
        description="Track deposits through available payment methods and withdrawals to your M-Pesa payout accounts."
        breadcrumbs={[{ label: "Wallet", href: "/wallet" }, { label: "History" }]}
        actions={
          <Button variant="outline" asChild>
            <a href="/records">Transaction records</a>
          </Button>
        }
      />

      {toolbar}

      <Tabs defaultValue="deposits">
        <TabsList>
          <TabsTrigger value="deposits">Deposits ({deposits?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals ({withdrawals?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="deposits" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {statusSelect(
              depositStatus,
              setDepositStatus,
              DEPOSIT_STATUS_META,
              "All deposit statuses",
              "Deposit status filter"
            )}
            <Button size="sm" variant="ghost" onClick={exportDeposits} disabled={!deposits?.length}>
              <Download />
              Export CSV
            </Button>
          </div>
          {depositsError ? (
            <ErrorState
              title="Deposits unavailable"
              description={depositsError.message}
              onRetry={() => void refetchDeposits()}
            />
          ) : depositsLoading ? (
            <TableSkeleton rows={6} cols={6} />
          ) : filteredDeposits.length === 0 ? (
            <EmptyState
              title={deposits?.length ? "No deposits match your filters" : "No deposits yet"}
              description={
                deposits?.length
                  ? "Try a different search term or status filter."
                  : "Your deposits will appear here."
              }
            />
          ) : (
            <DataTable
              columns={depositColumns}
              rows={filteredDeposits}
              keyExtractor={(d) => d.id}
              onRowClick={(d) => setDepositDetailId(d.id)}
              mobileCard={(d) => (
                <div className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="numeric truncate text-sm font-bold">{d.reference}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDateTime(d.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={d.status} meta={DEPOSIT_STATUS_META[d.status]} />
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="numeric text-base font-extrabold">{formatKES(d.amount)}</p>
                      <p className="numeric text-[11px] text-muted-foreground">
                        {d.method === "paypal" ? "PayPal" : `M-Pesa · ${maskPhone(d.phone)}`}
                      </p>
                      {d.method === "paypal" && d.providerReference && (
                        <p className="numeric max-w-48 truncate text-[11px] text-muted-foreground" title={d.providerReference}>
                          Ref {d.providerReference}
                        </p>
                      )}
                    </div>
                    {depositActions(d)}
                  </div>
                </div>
              )}
            />
          )}
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {statusSelect(
              withdrawalStatus,
              setWithdrawalStatus,
              WITHDRAWAL_STATUS_META,
              "All withdrawal statuses",
              "Withdrawal status filter"
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={exportWithdrawals}
              disabled={!withdrawals?.length}
            >
              <Download />
              Export CSV
            </Button>
          </div>
          {withdrawalsError ? (
            <ErrorState
              title="Withdrawals unavailable"
              description={withdrawalsError.message}
              onRetry={() => void refetchWithdrawals()}
            />
          ) : withdrawalsLoading ? (
            <TableSkeleton rows={6} cols={6} />
          ) : filteredWithdrawals.length === 0 ? (
            <EmptyState
              title={withdrawals?.length ? "No withdrawals match your filters" : "No withdrawals yet"}
              description={
                withdrawals?.length
                  ? "Try a different search term or status filter."
                  : "Your withdrawal requests will appear here."
              }
            />
          ) : (
            <DataTable
              columns={withdrawalColumns}
              rows={filteredWithdrawals}
              keyExtractor={(w) => w.id}
              onRowClick={(w) => setWithdrawalDetailId(w.id)}
              mobileCard={(w) => (
                <div className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="numeric truncate text-sm font-bold">{w.reference}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDateTime(w.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={w.status} meta={WITHDRAWAL_STATUS_META[w.status]} />
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="numeric text-base font-extrabold">{formatKES(w.amount)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Net {formatKES(w.netAmount)} · {maskPhone(w.payoutAccount.phone)}
                      </p>
                    </div>
                    {withdrawalActions(w)}
                  </div>
                </div>
              )}
            />
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!depositDetailId}
        onOpenChange={(open) => {
          if (!open) setDepositDetailId(null);
        }}
      >
        <DialogContent>
          {selectedDeposit ? (
            <>
              <DialogHeader>
                <DialogTitle>Deposit detail</DialogTitle>
                <DialogDescription className="numeric">{selectedDeposit.reference}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4">
                  <DetailRow label="Amount" value={formatKES(selectedDeposit.amount)} />
                  <DetailRow label="Fee" value={formatKES(selectedDeposit.fee)} />
                  <DetailRow
                    label="Net credited"
                    value={formatKES(selectedDeposit.amount - selectedDeposit.fee)}
                  />
                  <DetailRow label="Method" value={selectedDeposit.method === "paypal" ? "PayPal" : "M-Pesa"} />
                  {selectedDeposit.method === "paypal" ? (
                    <DetailRow label="PayPal reference" value={selectedDeposit.providerReference ?? "—"} />
                  ) : (
                    <DetailRow label="M-Pesa number" value={formatPhoneKE(selectedDeposit.phone)} />
                  )}
                  <DetailRow label="Wallet" value={WALLET_META[selectedDeposit.wallet].label} />
                  <DetailRow label="Status" value={selectedDeposit.status} />
                  <DetailRow label="Created" value={formatDateTime(selectedDeposit.createdAt)} />
                  {selectedDeposit.completedAt && (
                    <DetailRow
                      label="Completed"
                      value={formatDateTime(selectedDeposit.completedAt)}
                    />
                  )}
                  {selectedDeposit.method === "mpesa" && (
                    <DetailRow label="Checkout ID" value={selectedDeposit.checkoutRequestId} />
                  )}
                  {selectedDeposit.failureReason && (
                    <p className="text-xs font-semibold text-danger">{selectedDeposit.failureReason}</p>
                  )}
                </div>
                {selectedDeposit.events.length > 0 && (
                  <div>
                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Timeline
                    </p>
                    <TransactionTimeline events={selectedDeposit.events} />
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  {selectedDeposit.status === "pending" && (
                    <Button
                      variant="outline"
                      className="text-danger"
                      disabled={cancellingId === selectedDeposit.id}
                      onClick={() => void handleCancelDeposit(selectedDeposit.id)}
                    >
                      Cancel deposit
                    </Button>
                  )}
                  <Button onClick={() => setDepositDetailId(null)}>Close</Button>
                </div>
              </div>
            </>
          ) : (
            <CardSkeleton lines={5} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!withdrawalDetailId}
        onOpenChange={(open) => {
          if (!open) setWithdrawalDetailId(null);
        }}
      >
        <DialogContent>
          {selectedWithdrawal ? (
            <>
              <DialogHeader>
                <DialogTitle>Withdrawal detail</DialogTitle>
                <DialogDescription className="numeric">
                  {selectedWithdrawal.reference}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4">
                  <DetailRow label="Amount" value={formatKES(selectedWithdrawal.amount)} />
                  <DetailRow label="Fee" value={formatKES(selectedWithdrawal.fee)} />
                  <DetailRow label="Net payout" value={formatKES(selectedWithdrawal.netAmount)} />
                  <DetailRow label="Wallet" value={WALLET_META[selectedWithdrawal.wallet].label} />
                  <DetailRow
                    label="Payout"
                    value={`${selectedWithdrawal.payoutAccount.nickname} · ${formatPhoneKE(selectedWithdrawal.payoutAccount.phone)}`}
                  />
                  <DetailRow label="Status" value={selectedWithdrawal.status} />
                  <DetailRow label="Risk level" value={selectedWithdrawal.riskLevel} />
                  <DetailRow
                    label="PIN verified"
                    value={selectedWithdrawal.pinVerified ? "Yes" : "No"}
                  />
                  <DetailRow label="Created" value={formatDateTime(selectedWithdrawal.createdAt)} />
                  {selectedWithdrawal.paidAt && (
                    <DetailRow label="Paid" value={formatDateTime(selectedWithdrawal.paidAt)} />
                  )}
                  {selectedWithdrawal.rejectionReason && (
                    <p className="text-xs font-semibold text-danger">
                      {selectedWithdrawal.rejectionReason}
                    </p>
                  )}
                </div>
                {selectedWithdrawal.events.length > 0 && (
                  <div>
                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Timeline
                    </p>
                    <TransactionTimeline events={selectedWithdrawal.events} />
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  {selectedWithdrawal.status === "pending_approval" && (
                    <Button
                      variant="outline"
                      className="text-danger"
                      disabled={cancellingId === selectedWithdrawal.id}
                      onClick={() => void handleCancelWithdrawal(selectedWithdrawal.id)}
                    >
                      Cancel request
                    </Button>
                  )}
                  <Button onClick={() => setWithdrawalDetailId(null)}>Close</Button>
                </div>
              </div>
            </>
          ) : (
            <CardSkeleton lines={5} />
          )}
        </DialogContent>
      </Dialog>

      <p className="text-xs text-muted-foreground">
        Status updates appear here as they are recorded. Some deposit prompts or status changes
        may be simulated when live payment credentials are unavailable; confirm completed payments with the provider.
      </p>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Eye, MoreHorizontal, ShieldAlert, UserCog } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { CopyButton } from "@/components/shared/copy-button";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useApiQuery } from "@/hooks/use-api";
import { adminUserAction, getAdminUserById, getAdminUsers } from "@/lib/services/admin";
import { RANK_META } from "@/lib/constants";
import { formatDateTime, formatShortDate, initials, maskEmail, maskPhone } from "@/lib/utils";
import type { User } from "@/lib/types";

const PAGE_SIZE = 12;

const USER_STATUS_META: Record<string, { label: string; tone: string }> = {
  active: { label: "Active", tone: "success" },
  pending: { label: "Pending", tone: "info" },
  restricted: { label: "Restricted", tone: "warning" },
  frozen: { label: "Frozen", tone: "danger" },
};

const KYC_META: Record<string, { label: string; tone: string }> = {
  not_started: { label: "Not started", tone: "neutral" },
  pending: { label: "Pending", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
};

const RISK_META: Record<string, { label: string; tone: string }> = {
  low: { label: "Low risk", tone: "success" },
  medium: { label: "Medium risk", tone: "warning" },
  high: { label: "High risk", tone: "danger" },
};

type UserAction = "freeze" | "restrict_withdrawals" | "restrict_deposits" | "restrict_referrals" | "unfreeze" | "clear_flags";

const ACTION_LABELS: Record<UserAction, string> = {
  freeze: "Freeze account",
  unfreeze: "Activate account",
  restrict_withdrawals: "Restrict withdrawals",
  restrict_deposits: "Restrict deposits",
  restrict_referrals: "Restrict referrals",
  clear_flags: "Clear risk flags",
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
        Showing {from}–{to} of {total} users
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

export default function AdminUsersPage() {
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [risk, setRisk] = React.useState("all");
  const [page, setPage] = React.useState(1);

  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [pendingAction, setPendingAction] = React.useState<{ user: User; action: UserAction } | null>(null);
  const [reason, setReason] = React.useState("");
  const [reasonError, setReasonError] = React.useState("");
  const [actionPending, setActionPending] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  React.useEffect(() => {
    setPage(1);
  }, [debounced, status, risk]);

  const users = useApiQuery(
    ["admin", "users", debounced, status, risk, page],
    () => getAdminUsers({ search: debounced || undefined, status, risk, page })
  );

  const detail = useApiQuery(
    ["admin", "users", "detail", detailId ?? ""],
    () => getAdminUserById(detailId!),
    { enabled: !!detailId }
  );

  const openAction = (user: User, action: UserAction) => {
    setPendingAction({ user, action });
    setReason("");
    setReasonError("");
  };

  const submitAction = async () => {
    if (!pendingAction) return;
    if (!reason.trim()) {
      setReasonError("A reason is required for this action.");
      return;
    }
    setActionPending(true);
    const res = await adminUserAction(pendingAction.user.id, pendingAction.action, reason.trim());
    setActionPending(false);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success(`${ACTION_LABELS[pendingAction.action]} applied to ${pendingAction.user.fullName}`);
    setPendingAction(null);
    setReason("");
  };

  const columns: DataTableColumn<User>[] = [
    {
      key: "user",
      header: "User",
      primary: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            <AvatarFallback className="bg-secondary text-foreground text-xs font-bold">
              {initials(row.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{row.fullName}</p>
            <p className="numeric truncate text-xs text-muted-foreground">{row.accountNumber}</p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} meta={USER_STATUS_META[row.status]} />,
    },
    {
      key: "phone",
      header: "Phone",
      render: (row) => <span className="numeric text-xs">{maskPhone(row.phone)}</span>,
    },
    {
      key: "email",
      header: "Email",
      hideOnMobile: true,
      render: (row) => <span className="text-xs text-muted-foreground">{maskEmail(row.email)}</span>,
    },
    {
      key: "rank",
      header: "Rank",
      render: (row) => <Badge variant="secondary">{RANK_META[row.rank].label}</Badge>,
    },
    {
      key: "kyc",
      header: "KYC",
      hideOnMobile: true,
      render: (row) => <StatusBadge status={row.kycStatus} meta={KYC_META[row.kycStatus]} />,
    },
    {
      key: "risk",
      header: "Risk",
      render: (row) => <StatusBadge status={row.riskLevel} meta={RISK_META[row.riskLevel]} />,
    },
    {
      key: "joined",
      header: "Joined",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground" title={formatDateTime(row.joinedAt)}>
          {formatShortDate(row.joinedAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${row.fullName}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{row.accountNumber}</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setDetailId(row.id)}>
                <Eye /> View details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {row.status === "frozen" ? (
                <DropdownMenuItem onClick={() => openAction(row, "unfreeze")}>
                  <UserCog /> Activate account
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem variant="destructive" onClick={() => openAction(row, "freeze")}>
                  <ShieldAlert /> Freeze account
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => openAction(row, "restrict_withdrawals")}>
                Restrict withdrawals
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openAction(row, "restrict_deposits")}>
                Restrict deposits
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openAction(row, "restrict_referrals")}>
                Restrict referrals
              </DropdownMenuItem>
              {row.riskLevel !== "low" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => openAction(row, "clear_flags")}>
                    Clear risk flags
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const user = detail.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Search, review, and take action on member accounts across the platform."
        actions={<DemoDataBadge />}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search name, account number, phone or email"
          className="sm:max-w-sm sm:flex-1"
        />
        <div className="flex flex-wrap gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[160px]" aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="restricted">Restricted</SelectItem>
              <SelectItem value="frozen">Frozen</SelectItem>
            </SelectContent>
          </Select>
          <Select value={risk} onValueChange={setRisk}>
            <SelectTrigger className="w-[150px]" aria-label="Filter by risk level">
              <SelectValue placeholder="Risk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All risk levels</SelectItem>
              <SelectItem value="low">Low risk</SelectItem>
              <SelectItem value="medium">Medium risk</SelectItem>
              <SelectItem value="high">High risk</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {users.isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : users.error ? (
        <ErrorState
          title="Could not load users"
          description={users.error.message}
          onRetry={() => void users.refetch()}
        />
      ) : users.data && users.data.items.length > 0 ? (
        <div className="space-y-4">
          <DataTable
            columns={columns}
            rows={users.data.items}
            keyExtractor={(row) => row.id}
            onRowClick={(row) => setDetailId(row.id)}
          />
          <Pager page={users.data.page} total={users.data.total} pageSize={PAGE_SIZE} onPage={setPage} />
        </div>
      ) : (
        <EmptyState
          title="No users found"
          description="No accounts match the current search and filters."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setStatus("all");
                setRisk("all");
              }}
            >
              Reset filters
            </Button>
          }
        />
      )}

      <Dialog open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>User details</DialogTitle>
            <DialogDescription>Full profile, verification, and account controls.</DialogDescription>
          </DialogHeader>
          {detail.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-5 animate-pulse-soft rounded-md bg-muted" style={{ width: `${90 - i * 8}%` }} />
              ))}
            </div>
          ) : detail.error ? (
            <ErrorState
              title="Could not load this user"
              description={detail.error.message}
              onRetry={() => void detail.refetch()}
            />
          ) : user ? (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <Avatar className="size-14">
                  <AvatarFallback className="bg-secondary text-foreground text-base font-bold">
                    {initials(user.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-lg font-extrabold">{user.fullName}</p>
                    <StatusBadge status={user.status} meta={USER_STATUS_META[user.status]} />
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="numeric text-sm text-muted-foreground">{user.accountNumber}</span>
                    <CopyButton value={user.accountNumber} label="Copy account number" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                <InfoField label="Phone">
                  <span className="numeric">{user.phone}</span>
                </InfoField>
                <InfoField label="Email">{user.email}</InfoField>
                <InfoField label="Rank">
                  <Badge variant="secondary">{RANK_META[user.rank].label}</Badge>
                </InfoField>
                <InfoField label="Risk level">
                  <StatusBadge status={user.riskLevel} meta={RISK_META[user.riskLevel]} />
                </InfoField>
                <InfoField label="KYC status">
                  <StatusBadge status={user.kycStatus} meta={KYC_META[user.kycStatus]} />
                </InfoField>
                <InfoField label="Verification">
                  <StatusBadge
                    status={user.verificationStatus}
                    meta={{
                      label: user.verificationStatus.replace("_", " "),
                      tone:
                        user.verificationStatus === "verified"
                          ? "success"
                          : user.verificationStatus === "pending"
                            ? "warning"
                            : user.verificationStatus === "rejected"
                              ? "danger"
                              : "neutral",
                    }}
                  />
                </InfoField>
                <InfoField label="Phone verified">{user.phoneVerified ? "Yes" : "No"}</InfoField>
                <InfoField label="Email verified">{user.emailVerified ? "Yes" : "No"}</InfoField>
                <InfoField label="Two-factor">{user.twoFactorEnabled ? "Enabled" : "Disabled"}</InfoField>
                <InfoField label="Transaction PIN">{user.hasTransactionPin ? "Set" : "Not set"}</InfoField>
                <InfoField label="Joined">{formatDateTime(user.joinedAt)}</InfoField>
                <InfoField label="Last login">
                  {formatDateTime(user.lastLoginAt)}
                  <span className="block text-xs font-normal text-muted-foreground">
                    {user.lastLoginIp} · {user.device}
                  </span>
                </InfoField>
                <InfoField label="Referral code">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="numeric">{user.referralCode}</span>
                    <CopyButton value={user.referralCode} label="Copy referral code" />
                  </span>
                </InfoField>
                <InfoField label="Referred by">{user.referredBy ?? "Organic signup"}</InfoField>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Profile completion
                  </p>
                  <span className="numeric text-xs font-bold">{user.profileCompletion}%</span>
                </div>
                <Progress value={user.profileCompletion} />
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-danger">Danger zone</p>
                <div className="flex flex-wrap gap-2">
                  {user.status === "frozen" ? (
                    <Button variant="outline" size="sm" onClick={() => { setDetailId(null); openAction(user, "unfreeze"); }}>
                      Activate account
                    </Button>
                  ) : (
                    <Button variant="destructive" size="sm" onClick={() => { setDetailId(null); openAction(user, "freeze"); }}>
                      Freeze account
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => { setDetailId(null); openAction(user, "restrict_withdrawals"); }}>
                    Restrict withdrawals
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setDetailId(null); openAction(user, "restrict_deposits"); }}>
                    Restrict deposits
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setDetailId(null); openAction(user, "restrict_referrals"); }}>
                    Restrict referrals
                  </Button>
                  {user.riskLevel !== "low" && (
                    <Button variant="outline" size="sm" onClick={() => { setDetailId(null); openAction(user, "clear_flags"); }}>
                      Clear risk flags
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Every action is written to the audit log and requires a reason.{" "}
                  <Link href="/admin/audit-logs" className="font-semibold text-foreground underline">
                    View audit logs
                  </Link>
                </p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!pendingAction}
        onOpenChange={(open) => {
          if (!open && !actionPending) {
            setPendingAction(null);
            setReason("");
            setReasonError("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{pendingAction ? ACTION_LABELS[pendingAction.action] : "Account action"}</DialogTitle>
            <DialogDescription>
              {pendingAction
                ? `This will be applied to ${pendingAction.user.fullName} (${pendingAction.user.accountNumber}) and recorded in the audit log.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="action-reason">Reason</Label>
            <Textarea
              id="action-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (e.target.value.trim()) setReasonError("");
              }}
              placeholder="Explain why this action is being taken…"
              aria-invalid={!!reasonError}
            />
            {reasonError && (
              <p role="alert" className="text-xs font-semibold text-danger">
                {reasonError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPendingAction(null);
                setReason("");
              }}
              disabled={actionPending}
            >
              Cancel
            </Button>
            <Button
              variant={pendingAction?.action === "freeze" ? "destructive" : "default"}
              onClick={() => void submitAction()}
              disabled={actionPending}
            >
              {actionPending ? "Applying…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

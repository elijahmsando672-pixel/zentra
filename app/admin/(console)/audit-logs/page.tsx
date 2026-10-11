"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ClipboardList, History, OctagonAlert, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { SearchInput } from "@/components/shared/search-input";
import { CopyButton } from "@/components/shared/copy-button";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApiQuery } from "@/hooks/use-api";
import { getAuditLogs } from "@/lib/services/admin";
import { cn, formatDateTime, relativeTime, titleCase } from "@/lib/utils";
import type { AuditLog } from "@/lib/types";

const ACTION_OPTIONS = [
  { value: "all", label: "All actions" },
  { value: "login", label: "Login" },
  { value: "logout", label: "Logout" },
  { value: "user.suspend", label: "User suspended" },
  { value: "user.freeze", label: "User frozen" },
  { value: "withdrawal.approve", label: "Withdrawal approved" },
  { value: "withdrawal.reject", label: "Withdrawal rejected" },
  { value: "deposit.manual_review", label: "Deposit review" },
  { value: "product.update", label: "Product update" },
  { value: "coupon.create", label: "Coupon created" },
  { value: "risk.flag_add", label: "Risk flag added" },
  { value: "settings.update", label: "Settings update" },
];

const ROLE_BADGE: Record<string, string> = {
  super_admin: "bg-brand-navy text-brand-ink",
  admin: "bg-secondary text-secondary-foreground",
  finance: "bg-success-soft text-success",
  analyst: "bg-info-soft text-info",
  agent: "bg-warning-soft text-warning",
};

function detailsText(log: AuditLog) {
  if (log.oldValue && log.newValue) return `${log.oldValue} → ${log.newValue}`;
  if (log.oldValue) return log.oldValue;
  if (log.newValue) return log.newValue;
  return log.reason || "—";
}

function prettyJson(value?: string) {
  if (!value) return null;
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export default function AdminAuditLogsPage() {
  const [search, setSearch] = React.useState("");
  const [action, setAction] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [selected, setSelected] = React.useState<AuditLog | null>(null);

  const logs = useApiQuery(["admin", "audit-logs", search, action, page], () =>
    getAuditLogs({ search: search || undefined, action: action === "all" ? undefined : action, page })
  );

  const items = React.useMemo(() => {
    const list = logs.data?.items ?? [];
    const t = +new Date();
    return list.filter((l) => {
      const at = +new Date(l.at);
      if (from && at < +new Date(`${from}T00:00:00`)) return false;
      if (to && at > +new Date(`${to}T23:59:59`)) return false;
      return true;
    });
  }, [logs.data, from, to]);

  const stats = React.useMemo(() => {
    const pageItems = logs.data?.items ?? [];
    const dayAgo = Date.now() - 86_400_000;
    const last24h = pageItems.filter((l) => +new Date(l.at) >= dayAgo).length;
    const failed = pageItems.filter(
      (l) => l.action.includes("reject") || l.action.includes("fail") || l.action.includes("suspend")
    ).length;
    return { total: logs.data?.total ?? 0, last24h, failed };
  }, [logs.data]);

  const totalPages = Math.max(1, Math.ceil(stats.total / (logs.data?.pageSize ?? 14)));

  const columns: DataTableColumn<AuditLog>[] = [
    {
      key: "timestamp",
      header: "Timestamp",
      primary: true,
      render: (l) => (
        <div>
          <p className="numeric text-sm font-bold">{formatDateTime(l.at)}</p>
          <p className="text-xs text-muted-foreground">{relativeTime(l.at)}</p>
        </div>
      ),
    },
    {
      key: "actor",
      header: "Actor",
      secondary: true,
      render: (l) => (
        <div className="min-w-0">
          <p className="truncate font-semibold">{l.actor}</p>
          <Badge className={cn("mt-0.5 border-transparent", ROLE_BADGE[l.actorRole] ?? "bg-muted text-muted-foreground")}>
            {titleCase(l.actorRole)}
          </Badge>
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      hideOnMobile: true,
      render: (l) => (
        <Badge variant="outline" className="numeric font-mono uppercase tracking-wide">
          {l.action}
        </Badge>
      ),
    },
    {
      key: "entity",
      header: "Entity",
      hideOnMobile: true,
      render: (l) => (
        <span className="text-sm">
          {titleCase(l.entityType)}
          <span className="numeric ml-1 text-xs text-muted-foreground">{l.entityId}</span>
        </span>
      ),
    },
    {
      key: "ip",
      header: "IP",
      hideOnMobile: true,
      render: (l) => <span className="numeric text-xs text-muted-foreground">{l.ip}</span>,
    },
    {
      key: "details",
      header: "Details",
      render: (l) => (
        <span className="inline-flex max-w-full items-center gap-1.5">
          <span className="truncate text-sm text-muted-foreground">{detailsText(l)}</span>
          <CopyButton value={detailsText(l)} />
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Immutable event trail of staff actions across the operations console."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Audit Logs" }]}
        actions={<DemoDataBadge />}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total events" value={stats.total} icon={<History />} loading={logs.isLoading} supporting="on record" />
        <StatCard label="Last 24h" value={stats.last24h} icon={<ClipboardList />} loading={logs.isLoading} supporting="current page" />
        <StatCard label="Failed actions" value={stats.failed} icon={<OctagonAlert />} loading={logs.isLoading} supporting="current page" />
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search actor, entity, action…"
            className="lg:max-w-sm"
          />
          <Select
            value={action}
            onValueChange={(v) => {
              setAction(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="lg:w-56" size="sm" aria-label="Filter by action">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:items-center">
            <div className="flex items-center gap-2">
              <Label htmlFor="audit-from" className="w-10 shrink-0 text-xs">
                From
              </Label>
              <Input id="audit-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-40" />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="audit-to" className="w-10 shrink-0 text-xs">
                To
              </Label>
              <Input id="audit-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-40" />
            </div>
          </div>
        </div>
        <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
          Showing {items.length} of {stats.total} events
          {search || action !== "all" || from || to ? " (filtered)" : ""}
        </p>
      </Card>

      {logs.isLoading ? (
        <TableSkeleton rows={8} cols={5} />
      ) : logs.error ? (
        <ErrorState
          title="Could not load audit logs"
          description={logs.error.message}
          onRetry={() => void logs.refetch()}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={items}
          keyExtractor={(l) => l.id}
          onRowClick={(l) => setSelected(l)}
          emptyState={
            <EmptyState
              title="No events match"
              description={
                search || action !== "all" || from || to
                  ? "Try adjusting the search, action or date range."
                  : "No audit events have been recorded yet."
              }
            />
          }
        />
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Page {logs.data?.page ?? 1} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || logs.isLoading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!logs.data?.hasMore || logs.isLoading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <ChevronRight />
          </Button>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6">Audit event — {selected.action}</DialogTitle>
                <DialogDescription>{formatDateTime(selected.at)}</DialogDescription>
              </DialogHeader>

              <div className="grid gap-1.5 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Actor</span>
                  <span className="font-semibold">
                    {selected.actor} · {titleCase(selected.actorRole)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Entity</span>
                  <span className="font-semibold">
                    {titleCase(selected.entityType)} · <span className="numeric">{selected.entityId}</span>
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">IP</span>
                  <span className="numeric font-semibold">{selected.ip}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Reason</span>
                  <span className="text-right">{selected.reason || "—"}</span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Old value</p>
                  <pre className="numeric min-h-16 overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 text-xs whitespace-pre-wrap scrollbar-thin">
                    {prettyJson(selected.oldValue) ?? "—"}
                  </pre>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">New value</p>
                  <pre className="numeric min-h-16 overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 text-xs whitespace-pre-wrap scrollbar-thin">
                    {prettyJson(selected.newValue) ?? "—"}
                  </pre>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                <ShieldCheck className="size-4 shrink-0" />
                Audit records are retained for review. Full JSON snapshots are shown for inactive staff accounts.
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

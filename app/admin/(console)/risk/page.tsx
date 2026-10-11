"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Gauge, SearchX, ShieldAlert, ShieldCheck, Activity, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useApiQuery } from "@/hooks/use-api";
import { getAdminDashboard, getRiskFlags, updateRiskFlag } from "@/lib/services/admin";
import { cn, formatDateTime, relativeTime, titleCase } from "@/lib/utils";
import type { RiskFlag, RiskLevel } from "@/lib/types";

const FLAG_STATUS_META: Record<
  RiskFlag["status"],
  { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral" }
> = {
  open: { label: "Open", tone: "danger" },
  reviewing: { label: "Reviewing", tone: "warning" },
  cleared: { label: "Cleared", tone: "success" },
  escalated: { label: "Escalated", tone: "info" },
};

const LEVEL_META: Record<RiskLevel, { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  low: { label: "Low", tone: "success" },
  medium: { label: "Medium", tone: "warning" },
  high: { label: "High", tone: "danger" },
};

const LIFECYCLE_STEPS = ["Open", "Reviewing", "Cleared"] as const;

export default function AdminRiskPage() {
  const flags = useApiQuery(["admin", "risk-flags"], () => getRiskFlags());
  const dashboard = useApiQuery(["admin", "risk-dashboard"], getAdminDashboard);

  const [status, setStatus] = React.useState("all");
  const [level, setLevel] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [resolution, setResolution] = React.useState("");
  const [nextStatus, setNextStatus] = React.useState<RiskFlag["status"]>("reviewing");

  const resolve = useMutation({
    mutationFn: ({ id, status, resolution }: { id: string; status: RiskFlag["status"]; resolution?: string }) =>
      updateRiskFlag(id, status, resolution),
  });

  const list = React.useMemo(() => flags.data ?? [], [flags.data]);

  const stats = React.useMemo(() => {
    const open = list.filter((f) => f.status === "open" || f.status === "reviewing").length;
    const high = list.filter((f) => f.level === "high" && f.status !== "cleared").length;
    const reviewing = list.filter((f) => f.status === "reviewing").length;
    const resolved = list.filter((f) => f.status === "cleared").length;
    return { open, high, reviewing, resolved, total: list.length };
  }, [list]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((f) => {
      if (status !== "all" && f.status !== status) return false;
      if (level !== "all" && f.level !== level) return false;
      if (!q) return true;
      return (
        f.userName.toLowerCase().includes(q) ||
        f.userAccountNumber.toLowerCase().includes(q) ||
        f.rule.toLowerCase().includes(q) ||
        f.detail.toLowerCase().includes(q)
      );
    });
  }, [list, status, level, search]);

  const openFlag = selectedId ? list.find((f) => f.id === selectedId) ?? null : null;

  React.useEffect(() => {
    if (openFlag) {
      setNextStatus(openFlag.status === "cleared" ? "cleared" : "reviewing");
      setResolution(openFlag.status === "cleared" ? (openFlag.resolution ?? "") : "");
    }
  }, [openFlag]);

  const handleResolve = async () => {
    if (!openFlag) return;
    const res = await resolve.mutateAsync({
      id: openFlag.id,
      status: nextStatus,
      resolution: resolution.trim() || undefined,
    });
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success("Risk flag updated");
    setSelectedId(null);
  };

  const columns: DataTableColumn<RiskFlag>[] = [
    {
      key: "account",
      header: "Account",
      primary: true,
      render: (f) => (
        <div className="min-w-0">
          <p className="truncate font-semibold">{f.userName}</p>
          <p className="numeric text-xs text-muted-foreground">{f.userAccountNumber}</p>
        </div>
      ),
    },
    {
      key: "rule",
      header: "Rule",
      secondary: true,
      render: (f) => <span className="truncate text-sm">{f.rule}</span>,
    },
    {
      key: "level",
      header: "Level",
      hideOnMobile: true,
      render: (f) => <StatusBadge status={f.level} meta={LEVEL_META[f.level]} />,
    },
    {
      key: "status",
      header: "Status",
      hideOnMobile: true,
      render: (f) => <StatusBadge status={f.status} meta={FLAG_STATUS_META[f.status]} />,
    },
    {
      key: "detected",
      header: "Detected",
      render: (f) => <span className="text-xs text-muted-foreground">{relativeTime(f.createdAt)}</span>,
    },
    {
      key: "resolved",
      header: "Resolved",
      hideOnMobile: true,
      render: (f) => (
        <span className="text-xs text-muted-foreground">
          {f.resolvedAt ? relativeTime(f.resolvedAt) : "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Risk Centre"
        description="Automated and manual risk flags across member accounts, with resolution workflow."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Risk Centre" }]}
        actions={<DemoDataBadge />}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Active flags" value={stats.open} icon={<ShieldAlert />} loading={flags.isLoading} supporting="open or reviewing" />
        <StatCard label="High severity" value={stats.high} icon={<Gauge />} loading={flags.isLoading} supporting="not cleared" />
        <StatCard label="Under review" value={stats.reviewing} icon={<Activity />} loading={flags.isLoading} supporting="manual review" />
        <StatCard label="Resolved" value={stats.resolved} icon={<ShieldCheck />} loading={flags.isLoading} supporting="cleared flags" />
        <StatCard
          label="High-risk accounts"
          value={dashboard.data?.highRiskAccounts ?? 0}
          icon={<ArrowUpRight />}
          loading={dashboard.isLoading}
          supporting="system-wide"
        />
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search name, account, rule…"
            className="sm:max-w-sm"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="sm:w-48" size="sm" aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {(["open", "reviewing", "cleared", "escalated"] as const).map((s) => (
                <SelectItem key={s} value={s}>
                  {titleCase(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="sm:w-44" size="sm" aria-label="Filter by level">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              {(["low", "medium", "high"] as const).map((l) => (
                <SelectItem key={l} value={l}>
                  {titleCase(l)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground sm:ml-auto">
            Showing {filtered.length} of {list.length} flags
          </p>
        </div>
      </Card>

      <Card className="p-4">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 shrink-0 text-info" />
          Flag lifecycle: Open → Reviewing → Cleared, or escalated to super-admin review. Clearing a flag records a
          resolution note for the audit log.
        </p>
      </Card>

      {flags.isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : flags.error ? (
        <ErrorState
          title="Could not load risk flags"
          description={flags.error.message}
          onRetry={() => void flags.refetch()}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          keyExtractor={(f) => f.id}
          onRowClick={(f) => setSelectedId(f.id)}
          emptyState={
            <EmptyState
              icon={<SearchX />}
              title="No flags match"
              description={
                search || status !== "all" || level !== "all"
                  ? "Adjust the filters or search term to see more flags."
                  : "No risk flags are currently recorded."
              }
            />
          }
        />
      )}

      <Dialog open={!!openFlag} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-xl">
          {openFlag && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6">Risk flag — {openFlag.userName}</DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={openFlag.status} meta={FLAG_STATUS_META[openFlag.status]} />
                  <StatusBadge status={openFlag.level} meta={LEVEL_META[openFlag.level]} />
                  <span className="text-xs text-muted-foreground">created {relativeTime(openFlag.createdAt)}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-1.5 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Account</span>
                  <span className="numeric font-semibold">{openFlag.userAccountNumber}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Triggered rule</span>
                  <span className="text-right font-semibold">{openFlag.rule}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Detected</span>
                  <span>{formatDateTime(openFlag.createdAt)}</span>
                </div>
                {openFlag.resolvedAt && (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Resolved</span>
                    <span>{formatDateTime(openFlag.resolvedAt)}</span>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-border p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Detail</p>
                <p className="mt-1.5 text-sm leading-relaxed">{openFlag.detail}</p>
              </div>

              {openFlag.status === "cleared" && openFlag.resolution && (
                <div className="rounded-lg border border-success/25 bg-success-soft p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-success">Resolution</p>
                  <p className="mt-1.5 text-sm leading-relaxed">{openFlag.resolution}</p>
                </div>
              )}

              <div className="space-y-4 border-t border-border pt-4">
                <div className="space-y-2">
                  <Label htmlFor="flag-status">Update status</Label>
                  <Select value={nextStatus} onValueChange={(v) => setNextStatus(v as RiskFlag["status"])}>
                    <SelectTrigger id="flag-status">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {(["open", "reviewing", "cleared", "escalated"] as const).map((s) => (
                        <SelectItem key={s} value={s}>
                          {titleCase(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="flag-resolution">Resolution notes</Label>
                  <Textarea
                    id="flag-resolution"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder="Document what was checked and the outcome…"
                    className="min-h-24"
                  />
                  <p className="text-xs text-muted-foreground">
                    Required for clearing or escalating; stored with the flag.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedId(null)}>
                  Cancel
                </Button>
                <Button onClick={() => void handleResolve()} disabled={resolve.isPending || !nextStatus}>
                  {resolve.isPending ? "Saving…" : "Save update"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import * as React from "react";
import { BadgeCheck, Lock, ShieldCheck, UserCog, Users, UserX, Eye } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { EmptyState, ErrorState, CardSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useApiQuery } from "@/hooks/use-api";
import { adminStaffAction, getAdminStaff } from "@/lib/services/admin";
import { toast } from "sonner";
import { cn, formatDateTime, initials, relativeTime } from "@/lib/utils";
import type { AdminStaff, Role } from "@/lib/types";

const ROLE_META: Record<Role, { label: string; variant: "default" | "secondary" | "success" | "warning" | "danger" | "info" | "gold" | "navy" | "lime" }> = {
  super_admin: { label: "Super admin", variant: "navy" },
  admin: { label: "Admin", variant: "secondary" },
  finance: { label: "Finance", variant: "success" },
  analyst: { label: "Analyst", variant: "info" },
  agent: { label: "Agent", variant: "warning" },
  user: { label: "User", variant: "lime" },
};

const STATUS_META: Record<AdminStaff["status"], { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  active: { label: "Active", tone: "success" },
  invited: { label: "Invited", tone: "info" },
  suspended: { label: "Suspended", tone: "danger" },
};

const ROLE_LEGEND: { role: Role; description: string }[] = [
  { role: "super_admin", description: "Full platform access, staff management and system configuration." },
  { role: "admin", description: "Day-to-day administration across products, users and announcements." },
  { role: "finance", description: "Withdrawal approval, deposit review and ledger visibility." },
  { role: "analyst", description: "Reporting, ledger and risk-flag review with no payout access." },
  { role: "agent", description: "Member support queue handling and user profile views." },
];

function PermissionChip({ permission }: { permission: string }) {
  return (
    <Badge variant="outline" className="font-mono text-[10px]">
      {permission}
    </Badge>
  );
}

export default function AdminStaffPage() {
  const staff = useApiQuery(["admin", "staff"], getAdminStaff);
  const [selected, setSelected] = React.useState<AdminStaff | null>(null);

  const list = React.useMemo(() => staff.data ?? [], [staff.data]);

  const stats = React.useMemo(
    () => ({
      total: list.length,
      active: list.filter((s) => s.status === "active").length,
      suspended: list.filter((s) => s.status === "suspended").length,
      superAdmins: list.filter((s) => s.role === "super_admin").length,
    }),
    [list]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff & Roles"
        description="Operations staff directory, permission overview and role definitions."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Staff & Roles" }]}
        actions={<DemoDataBadge />}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total staff" value={stats.total} icon={<Users />} loading={staff.isLoading} supporting="across all roles" />
        <StatCard label="Active" value={stats.active} icon={<BadgeCheck />} loading={staff.isLoading} supporting="available now" />
        <StatCard label="Suspended" value={stats.suspended} icon={<UserX />} loading={staff.isLoading} supporting="no access" />
        <StatCard label="Super admins" value={stats.superAdmins} icon={<ShieldCheck />} loading={staff.isLoading} supporting="full control" />
      </div>

      {staff.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} lines={5} />
          ))}
        </div>
      ) : staff.error ? (
        <ErrorState
          title="Could not load staff"
          description={staff.error.message}
          onRetry={() => void staff.refetch()}
        />
      ) : list.length === 0 ? (
        <EmptyState title="No staff" description="The staff directory is empty." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((member) => (
            <Card key={member.id} className="animate-fade-up">
              <CardContent className="flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="size-11">
                      <AvatarFallback className="bg-brand-navy text-brand-ink">{initials(member.fullName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-bold">{member.fullName}</p>
                      <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <Badge className="shrink-0" variant={ROLE_META[member.role].variant}>
                    {ROLE_META[member.role].label}
                  </Badge>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">Status</span>
                    <Badge variant="outline" className={cn("gap-1.5 border-transparent")}>
                      <span className="size-1.5 rounded-full bg-current" />
                      {STATUS_META[member.status].label}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">Last active</span>
                    <span className="text-xs">{member.lastActiveAt ? relativeTime(member.lastActiveAt) : "Never"}</span>
                  </div>
                </div>

                <div className="min-h-8">
                  {member.permissions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No granular permissions — role-based access only.</p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {member.permissions.slice(0, 4).map((p) => (
                        <PermissionChip key={p} permission={p} />
                      ))}
                      {member.permissions.length > 4 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="secondary" className="cursor-help">
                              +{member.permissions.length - 4}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="flex flex-col gap-1">
                              {member.permissions.slice(4).map((p) => (
                                <span key={p} className="font-mono">
                                  {p}
                                </span>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-auto flex items-center gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelected(member)}>
                    <Eye />
                    View
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex-1">
                        <Button variant="outline" size="sm" className="w-full text-danger" onClick={async () => { const action = member.status === "active" ? "suspend" : "activate"; const result = await adminStaffAction(member.id, action); if (!result.ok) toast.error(result.message); else toast.success(`${member.fullName} ${action === "suspend" ? "suspended" : "activated"}.`); }}>
                          <Lock />
                          {member.status === "active" ? "Suspend" : "Activate"}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Manage this staff account.</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex-1">
                        <Button variant="outline" size="sm" className="w-full text-muted-foreground" onClick={async () => { const result = await adminStaffAction(member.id, "revoke_sessions"); if (!result.ok) toast.error(result.message); else toast.success(`Sessions revoked for ${member.fullName}.`); }}>
                          <UserCog />
                          Revoke sessions
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Manage this staff account.</TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="p-5">
          <p className="mb-3 flex items-center gap-2 text-sm font-bold">
            <ShieldCheck className="size-4 text-muted-foreground" />
            Role definitions
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ROLE_LEGEND.map((r) => (
              <div key={r.role} className="rounded-lg border border-border bg-muted/40 p-3">
                <Badge variant={ROLE_META[r.role].variant}>{ROLE_META[r.role].label}</Badge>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{r.description}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Role definitions are illustrative and not editable from this screen. Staff access changes are audit logged.
          </p>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-brand-navy text-brand-ink">{initials(selected.fullName)}</AvatarFallback>
                  </Avatar>
                  {selected.fullName}
                </DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2">
                  <Badge variant={ROLE_META[selected.role].variant}>{ROLE_META[selected.role].label}</Badge>
                  <span className="text-xs">{selected.email}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-1.5 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-semibold">{STATUS_META[selected.status].label}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Last active</span>
                  <span>{selected.lastActiveAt ? formatDateTime(selected.lastActiveAt) : "Never"}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Staff ID</span>
                  <span className="numeric font-semibold">{selected.id}</span>
                </div>
              </div>

              <div className="space-y-2 border-t border-border pt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Permissions ({selected.permissions.length})
                </p>
                {selected.permissions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Wildcard or role-based access — no listed permissions.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.permissions.map((p) => (
                      <PermissionChip key={p} permission={p} />
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                Staff access changes revoke active sessions where appropriate and are recorded in the audit log.
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

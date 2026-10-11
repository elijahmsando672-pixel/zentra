"use client";

import { useMemo, useState } from "react";
import { Award, CalendarRange, Megaphone, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApiQuery } from "@/hooks/use-api";
import { getAdminCampaigns, updateCampaignStatus } from "@/lib/services/admin";
import { toast } from "sonner";
import { cn, formatCompactKES, formatDateTime, formatKES, formatShortDate } from "@/lib/utils";
import type { Campaign } from "@/lib/types";

const STATUS_META: Record<CampaignStatus, { label: string; tone: string }> = {
  scheduled: { label: "Scheduled", tone: "info" },
  active: { label: "Active", tone: "success" },
  ended: { label: "Ended", tone: "neutral" },
  draft: { label: "Draft", tone: "warning" },
};

const ACCENT_CLASS: Record<Campaign["accent"], { border: string; tint: string; chip: string }> = {
  lime: { border: "border-t-primary", tint: "bg-primary/10", chip: "bg-primary text-primary-foreground" },
  gold: { border: "border-t-gold", tint: "bg-gold-soft/60", chip: "bg-gold text-gold-foreground" },
  blue: { border: "border-t-info", tint: "bg-info-soft/60", chip: "bg-info text-info-foreground" },
  emerald: { border: "border-t-success", tint: "bg-success-soft/60", chip: "bg-success text-success-foreground" },
};

const ACCENT_LABEL: Record<Campaign["accent"], string> = {
  lime: "Lime",
  gold: "Gold",
  blue: "Blue",
  emerald: "Emerald",
};

type CampaignStatus = Campaign["status"];
const STATUS_OPTIONS: { value: CampaignStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "scheduled", label: "Scheduled" },
  { value: "active", label: "Active" },
  { value: "ended", label: "Ended" },
  { value: "draft", label: "Draft" },
];

export default function CampaignsPage() {
  const { data, isLoading, error, refetch } = useApiQuery(["admin", "campaigns"], getAdminCampaigns);
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | "all">("all");
  const [selected, setSelected] = useState<Campaign | null>(null);

  const campaigns = useMemo(() => {
    const rows = data ?? [];
    if (statusFilter === "all") return rows;
    return rows.filter((c) => c.status === statusFilter);
  }, [data, statusFilter]);

  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0);
  const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0);
  const setCampaignStatus = async (campaign: Campaign, status: CampaignStatus) => {
    const result = await updateCampaignStatus(campaign.id, status);
    if (!result.ok) { toast.error(result.message); return; }
    toast.success(`Campaign marked ${status}.`);
    setSelected(result.data);
    await refetch();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        description="Marketing and bonus campaigns with budgets, audience targeting and awards issued."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Campaigns" }]}
        actions={<DemoDataBadge />}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            <span className="numeric font-semibold text-foreground">{campaigns.length}</span> campaigns
            · budget{" "}
            <span className="numeric font-semibold text-foreground">{formatCompactKES(totalBudget)}</span> ·
            spent{" "}
            <span className="numeric font-semibold text-foreground">{formatCompactKES(totalSpent)}</span>
          </span>
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as CampaignStatus | "all")}
        >
          <SelectTrigger className="w-[160px]" aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} lines={5} />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Could not load campaigns"
          description={error.message}
          onRetry={() => void refetch()}
        />
      ) : campaigns.length === 0 ? (
        <EmptyState
          title="No campaigns found"
          description={
            statusFilter === "all"
              ? "No campaigns have been created yet."
              : "No campaigns match the selected status."
          }
          action={
            statusFilter !== "all" ? (
              <Button variant="outline" onClick={() => setStatusFilter("all")}>
                Show all
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((campaign) => {
            const accent = ACCENT_CLASS[campaign.accent];
            const percent = campaign.budget > 0 ? Math.min(100, (campaign.spent / campaign.budget) * 100) : 0;
            return (
              <Card
                key={campaign.id}
                className={cn("flex cursor-pointer flex-col overflow-hidden border-t-2 transition-all hover:shadow-md", accent.border)}
                onClick={() => setSelected(campaign)}
              >
                <CardHeader className={cn("flex flex-row items-start justify-between gap-2", accent.tint)}>
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", accent.chip)}>
                      <Megaphone className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <CardTitle className="truncate">{campaign.name}</CardTitle>
                      <CardDescription className="truncate">{campaign.audience}</CardDescription>
                    </div>
                  </div>
                  <StatusBadge status={campaign.status} meta={STATUS_META[campaign.status]} />
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarRange className="size-3.5" />
                    <span>
                      {formatShortDate(campaign.startsAt)} – {formatShortDate(campaign.endsAt)}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Budget spent</span>
                      <span className="numeric font-extrabold">
                        {formatCompactKES(campaign.spent)}{" "}
                        <span className="text-muted-foreground">/ {formatCompactKES(campaign.budget)}</span>
                      </span>
                    </div>
                    <Progress
                      value={percent}
                      indicatorClassName={percent >= 100 ? "bg-danger" : percent >= 80 ? "bg-warning" : "bg-primary"}
                    />
                    <p className="numeric text-[11px] font-semibold text-muted-foreground">
                      {percent.toFixed(0)}% used
                    </p>
                  </div>
                  <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Award className="size-3.5" />
                      {campaign.awardsIssued.toLocaleString()} awards issued
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="size-3.5 text-muted-foreground" />
                      <span className="font-semibold">{campaign.audience}</span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg" aria-describedby="campaign-detail-description">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name}</DialogTitle>
                <DialogDescription id="campaign-detail-description">
                  {selected.description}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={selected.status} meta={STATUS_META[selected.status]} />
                <Badge variant="outline" className="border-border">
                  {ACCENT_LABEL[selected.accent]} accent
                </Badge>
                <Badge variant="secondary">{formatShortDate(selected.startsAt)} – {formatShortDate(selected.endsAt)}</Badge>
              </div>

              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Starts
                  </dt>
                  <dd className="mt-0.5 font-semibold">{formatDateTime(selected.startsAt)}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Ends
                  </dt>
                  <dd className="mt-0.5 font-semibold">{formatDateTime(selected.endsAt)}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Audience
                  </dt>
                  <dd className="mt-0.5 font-semibold">{selected.audience}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Awards issued
                  </dt>
                  <dd className="numeric mt-0.5 font-extrabold">
                    {selected.awardsIssued.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Budget
                  </dt>
                  <dd className="numeric mt-0.5 font-extrabold">{formatKES(selected.budget, { decimals: 0 })}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Remaining
                  </dt>
                  <dd className="numeric mt-0.5 font-extrabold">
                    {formatKES(Math.max(0, selected.budget - selected.spent), { decimals: 0 })}
                  </dd>
                </div>
              </dl>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Spend</span>
                  <span className="numeric font-extrabold">
                    {formatCompactKES(selected.spent)}{" "}
                    <span className="text-muted-foreground">/ {formatCompactKES(selected.budget)}</span>
                  </span>
                </div>
                <Progress
                  value={selected.budget > 0 ? Math.min(100, (selected.spent / selected.budget) * 100) : 0}
                  indicatorClassName={
                    selected.budget > 0 && selected.spent / selected.budget >= 1
                      ? "bg-danger"
                      : "bg-primary"
                  }
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button variant="outline" onClick={() => void setCampaignStatus(selected, "draft")}>Set draft</Button>
                {selected.status === "active" ? (
                  <Button variant="outline" onClick={() => void setCampaignStatus(selected, "ended")}>End campaign</Button>
                ) : (
                  <Button onClick={() => void setCampaignStatus(selected, "active")}>Activate campaign</Button>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

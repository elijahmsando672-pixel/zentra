"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Clock, MessageSquare, Send, ShieldCheck, Star } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { SearchInput } from "@/components/shared/search-input";
import { CopyButton } from "@/components/shared/copy-button";
import { StatusBadge } from "@/components/shared/status-badge";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useApiQuery } from "@/hooks/use-api";
import { adminCloseTicket as closeTicket, getAdminSupportTickets as getSupportTickets, adminReplyToTicket as replyToTicket } from "@/lib/services/support";
import { getAdminDashboard } from "@/lib/services/admin";
import { cn, formatDateTime, relativeTime, titleCase } from "@/lib/utils";
import type { SupportTicket, TicketStatus } from "@/lib/types";

const TICKET_STATUS_META: Record<TicketStatus, { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  open: { label: "Open", tone: "info" },
  in_progress: { label: "In progress", tone: "warning" },
  waiting_on_you: { label: "Waiting on customer", tone: "warning" },
  resolved: { label: "Resolved", tone: "success" },
  closed: { label: "Closed", tone: "neutral" },
};

const PRIORITY_META = {
  low: { label: "Low", tone: "neutral" as const },
  normal: { label: "Normal", tone: "neutral" as const },
  high: { label: "High", tone: "danger" as const },
};

const CATEGORIES = ["deposits", "withdrawals", "investments", "account", "rewards", "other"] as const;

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "waiting_on_you", label: "Waiting on customer" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

function firstAgentReplyTicket(t: SupportTicket) {
  return t.messages.find((m) => m.authorRole === "agent");
}

function formatHours(hours: number | null) {
  if (hours === null) return "—";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  return `${hours.toFixed(1)}h`;
}

export default function AdminSupportPage() {
  const tickets = useApiQuery(["admin", "support-tickets"], getSupportTickets);
  const dashboard = useApiQuery(["admin", "support-dashboard"], getAdminDashboard);

  const [statusTab, setStatusTab] = React.useState("all");
  const [category, setCategory] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [reply, setReply] = React.useState("");
  const [closeOpen, setCloseOpen] = React.useState(false);

  const replyMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => replyToTicket(id, body),
  });
  const closeMutation = useMutation({
    mutationFn: closeTicket,
  });

  const list = React.useMemo(() => tickets.data ?? [], [tickets.data]);

  const stats = React.useMemo(() => {
    const open = list.filter((t) => t.status === "open").length;
    const waitingOnUs = list.filter((t) => t.status === "open" || t.status === "in_progress").length;
    const waitingOnCustomer = list.filter((t) => t.status === "waiting_on_you").length;
    const resolved = list.filter((t) => t.status === "resolved").length;
    const responded = list
      .filter((t) => {
        const agent = firstAgentReplyTicket(t);
        return agent && +new Date(agent.at) >= +new Date(t.createdAt);
      })
      .map((t) => {
        const agent = firstAgentReplyTicket(t)!;
        return (+new Date(agent.at) - +new Date(t.createdAt)) / 3_600_000;
      });
    const avgFirstResponse =
      responded.length > 0 ? responded.reduce((s, v) => s + v, 0) / responded.length : null;
    return { open, waitingOnUs, waitingOnCustomer, resolved, avgFirstResponse, total: list.length };
  }, [list]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((t) => {
      if (statusTab !== "all" && t.status !== statusTab) return false;
      if (category !== "all" && t.category !== category) return false;
      if (!q) return true;
      return (
        t.reference.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.messages.some((m) => m.body.toLowerCase().includes(q))
      );
    });
  }, [list, statusTab, category, search]);

  const openTicket = selectedId ? list.find((t) => t.id === selectedId) ?? null : null;

  const handleSendReply = async () => {
    if (!openTicket || !reply.trim()) {
      toast.error("Write a reply before sending.");
      return;
    }
    const res = await replyMutation.mutateAsync({ id: openTicket.id, body: reply.trim() });
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success("Reply sent");
    setReply("");
  };

  const handleClose = async () => {
    if (!openTicket) return;
    const res = await closeMutation.mutateAsync(openTicket.id);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success("Ticket closed");
    setCloseOpen(false);
  };

  const columns: DataTableColumn<SupportTicket>[] = [
    {
      key: "reference",
      header: "Reference",
      primary: true,
      render: (t) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="numeric text-sm font-bold">{t.reference}</span>
          <CopyButton value={t.reference} aria-label={`Copy ${t.reference}`} />
        </span>
      ),
    },
    {
      key: "subject",
      header: "Subject",
      secondary: true,
      className: "max-w-[320px]",
      render: (t) => (
        <div className="min-w-0">
          <p className="truncate font-semibold">{t.subject}</p>
          <p className="truncate text-xs text-muted-foreground">
            {t.messages.length} message{t.messages.length === 1 ? "" : "s"}
          </p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      hideOnMobile: true,
      render: (t) => <Badge variant="outline">{titleCase(t.category)}</Badge>,
    },
    {
      key: "priority",
      header: "Priority",
      hideOnMobile: true,
      render: (t) => <StatusBadge status={t.priority} meta={PRIORITY_META[t.priority]} />,
    },
    {
      key: "status",
      header: "Status",
      hideOnMobile: true,
      render: (t) => <StatusBadge status={t.status} meta={TICKET_STATUS_META[t.status]} />,
    },
    {
      key: "lastReply",
      header: "Last reply",
      render: (t) => (
        <span className={cn("text-xs font-semibold", t.lastReplyBy === "user" ? "text-warning" : "text-muted-foreground")}>
          {t.lastReplyBy === "user" ? "Awaiting agent" : t.lastReplyBy === "agent" ? "Agent replied" : "No replies"}
        </span>
      ),
    },
    {
      key: "updated",
      header: "Updated",
      hideOnMobile: true,
      render: (t) => <span className="text-xs text-muted-foreground">{relativeTime(t.updatedAt)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support Centre"
        description="Member tickets, first-response SLA, and resolution status across the support queue."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Support" }]}
        actions={<DemoDataBadge />}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Open tickets"
          value={stats.total}
          icon={<MessageSquare />}
          loading={tickets.isLoading}
          supporting="all non-resolved"
        />
        <StatCard
          label="Waiting on us"
          value={stats.waitingOnUs}
          icon={<ShieldCheck />}
          loading={tickets.isLoading}
          supporting="agent action needed"
        />
        <StatCard
          label="Waiting on customer"
          value={stats.waitingOnCustomer}
          icon={<Clock />}
          loading={tickets.isLoading}
          supporting="customer reply"
        />
        <StatCard
          label="Resolved"
          value={stats.resolved}
          icon={<CheckCircle2 />}
          loading={tickets.isLoading}
          supporting={`${stats.open} still open`}
        />
        <StatCard
          label="Avg first response"
          value={formatHours(stats.avgFirstResponse)}
          icon={<Clock />}
          loading={tickets.isLoading}
          supporting="across replied tickets"
        />
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={statusTab} onValueChange={setStatusTab} className="min-w-0">
            <TabsList className="max-w-[100vw] overflow-x-auto no-scrollbar">
              {STATUS_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <Separator className="my-4" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search reference, subject, message…"
            className="sm:max-w-sm"
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="sm:w-56" size="sm" aria-label="Filter by category">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {titleCase(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground sm:ml-auto">
            Showing {filtered.length} of {list.length} tickets
          </p>
        </div>
      </Card>

      {tickets.isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : tickets.error ? (
        <ErrorState
          title="Could not load tickets"
          description={tickets.error.message}
          onRetry={() => void tickets.refetch()}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          keyExtractor={(t) => t.id}
          onRowClick={(t) => setSelectedId(t.id)}
          emptyState={
            <EmptyState
              title="No tickets match"
              description={
                search || category !== "all" || statusTab !== "all"
                  ? "Try adjusting the filters or search term."
                  : "There are no support tickets yet."
              }
            />
          }
        />
      )}

      {dashboard.error && (
        <p className="text-xs text-danger">Dashboard stats unavailable: {dashboard.error.message}</p>
      )}

      <Dialog open={!!openTicket} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-2xl">
          {openTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6">{openTicket.subject}</DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="numeric font-semibold">{openTicket.reference}</span>
                    <CopyButton value={openTicket.reference} aria-label="Copy ticket reference" />
                  </span>
                  <StatusBadge status={openTicket.status} meta={TICKET_STATUS_META[openTicket.status]} />
                  <StatusBadge status={openTicket.priority} meta={PRIORITY_META[openTicket.priority]} />
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-1.5 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Category</span>
                  <Badge variant="outline">{titleCase(openTicket.category)}</Badge>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Created</span>
                  <span>{formatDateTime(openTicket.createdAt)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">SLA due</span>
                  <span className="inline-flex items-center gap-1.5">
                    {formatDateTime(openTicket.slaDueAt)}
                    {new Date(openTicket.slaDueAt).getTime() < Date.now() && openTicket.status !== "resolved" && openTicket.status !== "closed" && (
                      <Badge variant="danger">Past SLA</Badge>
                    )}
                  </span>
                </div>
                {openTicket.satisfaction && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Satisfaction</span>
                    <span className="inline-flex items-center gap-1" aria-label={`Rating ${openTicket.satisfaction} of 5`}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className={cn("size-4", i <= openTicket.satisfaction! ? "fill-current text-warning" : "text-muted-foreground")}
                        />
                      ))}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-3 border-t border-border pt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Conversation ({openTicket.messages.length})
                </p>
                {openTicket.messages.length === 0 ? (
                  <EmptyState title="No messages" description="This ticket has no messages yet." />
                ) : (
                  openTicket.messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn("flex flex-col", m.authorRole === "user" ? "items-end" : "items-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[90%] rounded-lg border px-3.5 py-2.5 text-sm",
                          m.authorRole === "agent" && "bg-card border-border",
                          m.authorRole === "user" && "border-info/25 bg-info-soft",
                          m.authorRole === "system" && "border-border bg-muted text-muted-foreground"
                        )}
                      >
                        <p className="mb-1 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold">
                          <span>{m.author}</span>
                          <span className="text-muted-foreground">{formatDateTime(m.at)}</span>
                        </p>
                        <p className="leading-relaxed whitespace-pre-wrap">{m.body}</p>
                        {m.attachments?.length ? (
                          <p className="mt-1.5 text-xs text-muted-foreground">
                            {m.attachments.map((a) => `${a.name} (${a.size})`).join(" · ")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2 border-t border-border pt-4">
                <Label htmlFor="ticket-reply">Reply to member</Label>
                <Textarea
                  id="ticket-reply"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={
                    openTicket.status === "closed"
                      ? "This ticket is closed."
                      : openTicket.status === "resolved"
                        ? "This ticket is resolved; replying will reopen it."
                        : "Type your response…"
                  }
                  disabled={openTicket.status === "closed"}
                  className="min-h-24"
                />
                <p className="text-xs text-muted-foreground">
                  Replies are added to the support thread and attributed to the signed-in staff member.
                </p>
              </div>

              <DialogFooter className="flex-wrap items-center gap-2">
                <AlertDialog open={closeOpen} onOpenChange={setCloseOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={openTicket.status === "closed" || closeMutation.isPending}
                      className="text-danger"
                    >
                      Close ticket
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Close this ticket?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {openTicket.reference} will be marked as closed. The conversation is kept for audit purposes.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        disabled={closeMutation.isPending}
                        onClick={(e) => {
                          e.preventDefault();
                          void handleClose();
                        }}
                      >
                        {closeMutation.isPending ? "Closing…" : "Close ticket"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button
                  onClick={() => void handleSendReply()}
                  disabled={!reply.trim() || replyMutation.isPending || openTicket.status === "closed"}
                >
                  <Send />
                  {replyMutation.isPending ? "Sending…" : "Send reply"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

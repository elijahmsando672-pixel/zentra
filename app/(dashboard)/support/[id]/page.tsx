"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Send, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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
import { PageHeader } from "@/components/shared/page-header";
import { CopyButton } from "@/components/shared/copy-button";
import { CardSkeleton, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { useApiQuery } from "@/hooks/use-api";
import {
  closeTicket,
  getTicketById,
  rateTicket,
  replyToTicket,
} from "@/lib/services/support";
import { cn, formatDateTime, relativeTime, titleCase } from "@/lib/utils";
import { toast } from "sonner";
import type { SupportMessage, TicketPriority, TicketStatus } from "@/lib/types";

const TICKET_STATUS_META: Record<TicketStatus, { label: string; tone: string }> = {
  open: { label: "Open", tone: "info" },
  in_progress: { label: "In progress", tone: "info" },
  waiting_on_you: { label: "Waiting on you", tone: "warning" },
  resolved: { label: "Resolved", tone: "success" },
  closed: { label: "Closed", tone: "neutral" },
};

const TICKET_PRIORITY_META: Record<TicketPriority, { label: string; tone: string }> = {
  low: { label: "Low", tone: "neutral" },
  normal: { label: "Normal", tone: "info" },
  high: { label: "High", tone: "danger" },
};

function MessageBubble({ message }: { message: SupportMessage }) {
  if (message.authorRole === "system") {
    return (
      <li className="flex justify-center">
        <span className="rounded-full bg-muted px-4 py-1.5 text-center text-[11px] font-bold text-muted-foreground">
          {message.body}
        </span>
      </li>
    );
  }

  const isUser = message.authorRole === "user";

  return (
    <li className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="font-bold text-foreground">{message.author}</span>
        <span>{relativeTime(message.at)}</span>
      </div>
      <div
        className={cn(
          "max-w-[88%] rounded-lg border px-4 py-3 text-sm leading-relaxed shadow-xs sm:max-w-[75%]",
          isUser ? "border-primary/50 bg-primary/10" : "border-border bg-card"
        )}
      >
        <p className="whitespace-pre-wrap">{message.body}</p>
        {message.attachments && message.attachments.length > 0 && (
          <ul className="mt-2 space-y-1 border-t border-border pt-2">
            {message.attachments.map((a) => (
              <li key={a.name} className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="truncate font-semibold">{a.name}</span>
                <span className="numeric shrink-0">{a.size}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

export default function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const ticket = useApiQuery(["support", "ticket", id], () => getTicketById(id));

  const [reply, setReply] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [closing, setClosing] = React.useState(false);
  const [rating, setRating] = React.useState(false);

  const t = ticket.data;
  const isClosed = t?.status === "closed";
  const canRate = !!t && (t.status === "closed" || t.status === "resolved" || t.satisfaction !== undefined);

  const sendReply = async () => {
    const body = reply.trim();
    if (!body) return;
    setSending(true);
    const res = await replyToTicket(id, body);
    setSending(false);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    setReply("");
    toast.success("Reply sent");
    void ticket.refetch();
  };

  const close = async () => {
    setClosing(true);
    const res = await closeTicket(id);
    setClosing(false);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success("Ticket closed");
    void ticket.refetch();
  };

  const rate = async (value: 1 | 2 | 3 | 4 | 5) => {
    setRating(true);
    const res = await rateTicket(id, value);
    setRating(false);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success("Thanks for rating this ticket");
    void ticket.refetch();
  };

  if (ticket.isPending) {
    return (
      <div className="space-y-6 animate-fade-up">
        <PageHeader title="Loading ticket…" breadcrumbs={[{ label: "Support", href: "/support" }]} />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <CardSkeleton lines={4} />
            <CardSkeleton lines={3} />
          </div>
          <CardSkeleton lines={5} />
        </div>
      </div>
    );
  }

  if (ticket.isError || !t) {
    return (
      <div className="space-y-6 animate-fade-up">
        <PageHeader title="Ticket" breadcrumbs={[{ label: "Support", href: "/support" }, { label: "Ticket" }]} />
        <ErrorState
          title="Could not load this ticket"
          description={ticket.error?.message ?? "It may have been removed."}
          onRetry={() => void ticket.refetch()}
          action={
            <Button asChild variant="outline">
              <Link href="/support">Back to support</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title={t.subject}
        description={`Ticket ${t.reference} · last updated ${relativeTime(t.updatedAt)}`}
        breadcrumbs={[{ label: "Support", href: "/support" }, { label: t.reference }]}
        actions={
          <>
            <CopyButton value={t.reference} label="Copy reference" size="default" variant="outline" />
            <StatusBadge status={t.status} meta={TICKET_STATUS_META[t.status]} />
            <StatusBadge status={t.priority} meta={TICKET_PRIORITY_META[t.priority]} />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conversation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <ul className="max-h-[520px] space-y-4 overflow-y-auto pr-1">
                {t.messages.map((m) => (
                  <MessageBubble key={m.id} message={m} />
                ))}
              </ul>

              <Separator />

              {isClosed ? (
                <p className="text-sm text-muted-foreground">
                  This ticket is closed. Open a new ticket if you need further help.
                </p>
              ) : (
                <div className="space-y-3">
                  <Label htmlFor="reply">Your reply</Label>
                  <Textarea
                    id="reply"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={4}
                    placeholder="Add more detail, confirmation numbers, or answering the agent's question…"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">Replies appear in this thread once submitted.</p>
                    <Button onClick={() => void sendReply()} disabled={sending || !reply.trim()}>
                      {sending ? "Sending…" : (<><Send /> Send reply</>)}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Category</span>
                <Badge variant="outline">{titleCase(t.category)}</Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Created</span>
                <span className="numeric text-xs font-semibold">{formatDateTime(t.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Last updated</span>
                <span className="numeric text-xs font-semibold">{formatDateTime(t.updatedAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">SLA due</span>
                <span className="numeric text-xs font-semibold">{formatDateTime(t.slaDueAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Messages</span>
                <span className="numeric text-xs font-semibold">{t.messages.length}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Satisfaction</span>
                {t.satisfaction ? (
                  <span className="numeric text-xs font-bold text-success">{t.satisfaction} / 5</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Not rated</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full" disabled={isClosed}>
                    {isClosed ? "Ticket closed" : "Close ticket"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Close this ticket?</AlertDialogTitle>
                    <AlertDialogDescription>
                      The conversation will be marked as closed. You can still open a new ticket later.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep open</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void close()} disabled={closing}>
                      {closing ? "Closing…" : "Close ticket"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {canRate && (
                <div className="space-y-2 rounded-lg border border-border bg-muted/50 p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    How was the support?
                  </p>
                  <div className="flex items-center gap-2">
                    {([1, 2, 3, 4, 5] as const).map((n) => (
                      <Button
                        key={n}
                        type="button"
                        size="icon-sm"
                        variant={(t.satisfaction ?? 0) >= n ? "default" : "outline"}
                        onClick={() => void rate(n)}
                        disabled={rating}
                        aria-label={`Rate ${n} out of 5`}
                      >
                        <Star className={cn((t.satisfaction ?? 0) >= n && "fill-current")} />
                      </Button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">Shown once a ticket is resolved or closed.</p>
                </div>
              )}

              <Button asChild variant="ghost" className="w-full">
                <Link href="/support">
                  <ArrowLeft /> Back to all tickets
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

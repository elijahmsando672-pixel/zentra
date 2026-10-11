"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, Clock, Headphones, Mail, MessageSquare, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { useApiQuery } from "@/hooks/use-api";
import { getPublicPaymentConfig } from "@/lib/services/deposits";
import { ADMIN_EMAIL, DEFAULT_WHATSAPP_NUMBER } from "@/lib/constants";
import { getSupportTickets } from "@/lib/services/support";
import { formatPhoneKE, normalizePhoneKE, relativeTime, titleCase } from "@/lib/utils";
import type { TicketPriority, TicketStatus } from "@/lib/types";

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

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "waiting", label: "Waiting" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
] as const;

export default function SupportPage() {
  const tickets = useApiQuery(["support", "tickets"], getSupportTickets);
  const paymentConfig = useApiQuery(["public", "payment-config"], getPublicPaymentConfig);
  const whatsappNumber = paymentConfig.data?.contact.whatsappNumber || DEFAULT_WHATSAPP_NUMBER;
  const whatsappUrl = `https://wa.me/${normalizePhoneKE(whatsappNumber)}`;
  const supportEmail = paymentConfig.data?.contact.adminEmail || ADMIN_EMAIL;
  const [tab, setTab] = React.useState("all");

  const list = tickets.data ?? [];
  const counts = {
    all: list.length,
    open: list.filter((t) => t.status === "open" || t.status === "in_progress").length,
    waiting: list.filter((t) => t.status === "waiting_on_you").length,
    resolved: list.filter((t) => t.status === "resolved").length,
    closed: list.filter((t) => t.status === "closed").length,
  };

  const visible = list.filter((t) => {
    if (tab === "all") return true;
    if (tab === "open") return t.status === "open" || t.status === "in_progress";
    if (tab === "waiting") return t.status === "waiting_on_you";
    if (tab === "resolved") return t.status === "resolved";
    return t.status === "closed";
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Support"
        description="Help centre, direct channels, and every ticket you have open with the Zentra team."
        actions={
          <>
            <DemoDataBadge />
            <Button asChild>
              <Link href="/support/new">
                <Plus /> Open a ticket
              </Link>
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="gradient-navy grid-pattern relative">
          <div className="relative grid gap-4 p-5 sm:grid-cols-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-white/70">
                <MessageSquare className="size-4" />
                <span className="text-[11px] font-bold tracking-widest uppercase">WhatsApp</span>
              </div>
              <p className="numeric text-sm font-bold text-white">{formatPhoneKE(whatsappNumber)}</p>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-white/70 underline-offset-4 hover:underline"
              >
                Start a chat
              </a>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-white/70">
                <Mail className="size-4" />
                <span className="text-[11px] font-bold tracking-widest uppercase">Email</span>
              </div>
              <p className="numeric text-sm font-bold text-white">{supportEmail}</p>
              <a href={`mailto:${supportEmail}`} className="text-xs font-semibold text-white/70 underline-offset-4 hover:underline">
                Send a message
              </a>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-white/70">
                <Clock className="size-4" />
                <span className="text-[11px] font-bold tracking-widest uppercase">Support hours</span>
              </div>
              <p className="text-sm font-bold text-white">Mon–Sat, 08:00–20:00 EAT</p>
              <p className="text-xs text-white/70">Typical first response under 4 hours</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="All tickets" value={counts.all} icon={<Headphones className="size-5" />} loading={tickets.isPending} supporting="Across every category" />
        <StatCard label="Open" value={counts.open} icon={<MessageSquare className="size-5" />} loading={tickets.isPending} supporting="Open or in progress" />
        <StatCard label="Waiting on you" value={counts.waiting} icon={<Clock className="size-5" />} loading={tickets.isPending} supporting="Needs your reply" />
        <StatCard label="Resolved" value={counts.resolved} icon={<Mail className="size-5" />} loading={tickets.isPending} supporting="Closed by the team" />
      </div>

      {tickets.isError && (
        <ErrorState title="Could not load your tickets" description={tickets.error?.message} onRetry={() => void tickets.refetch()} />
      )}

      <div className="space-y-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-auto flex-wrap">
            {STATUS_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label} · {counts[t.value as keyof typeof counts]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {tickets.isPending && <TableSkeleton rows={4} cols={4} />}

        {tickets.data && visible.length === 0 && (
          <EmptyState
            title={tab === "all" ? "No tickets yet" : "Nothing in this view"}
            description={
              tab === "all"
                ? "When you need help with deposits, withdrawals or your account, open a ticket and our team will respond."
                : "No tickets match this filter right now."
            }
            action={
              <Button asChild>
                <Link href="/support/new">
                  <Plus /> Open a ticket
                </Link>
              </Button>
            }
          />
        )}

        {visible.map((t) => (
          <Link key={t.id} href={`/support/${t.id}`} className="block">
            <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="numeric text-[11px] font-bold text-muted-foreground">{t.reference}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {titleCase(t.category)}
                    </Badge>
                  </div>
                  <p className="truncate text-sm font-bold sm:text-base">{t.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.lastReplyBy === "agent"
                      ? "Support replied last"
                      : t.lastReplyBy === "user"
                        ? "You replied last"
                        : "No replies yet"}
                    {" · "}
                    Updated {relativeTime(t.updatedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={t.status} meta={TICKET_STATUS_META[t.status]} />
                  <StatusBadge status={t.priority} meta={TICKET_PRIORITY_META[t.priority]} />
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

import * as React from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateTime, formatKES, relativeTime } from "@/lib/utils";
import { TRANSACTION_TYPE_META } from "@/lib/constants";
import { StatusBadge } from "@/components/shared/status-badge";
import type { Transaction, TransactionEvent } from "@/lib/types";

export function TransactionIcon({
  type,
  className,
  direction,
}: {
  type: Transaction["type"];
  className?: string;
  direction?: "incoming" | "outgoing";
}) {
  const meta = TRANSACTION_TYPE_META[type];
  const Icon = meta.icon;
  const tone = meta.tone;
  return (
    <span
      className={cn(
        "relative flex size-10 shrink-0 items-center justify-center rounded-md",
        tone === "in" && "bg-success-soft text-success",
        tone === "out" && "bg-danger-soft text-danger",
        tone === "neutral" && "bg-secondary text-foreground",
        className
      )}
    >
      <Icon className="size-4.5" />
      {direction && (
        <span
          className={cn(
            "absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full border-2 border-card",
            direction === "incoming" ? "bg-success text-white" : "bg-brand-deep text-white"
          )}
        >
          {direction === "incoming" ? <ArrowDownLeft className="size-2.5" /> : <ArrowUpRight className="size-2.5" />}
        </span>
      )}
    </span>
  );
}

export function TransactionRow({
  tx,
  onOpen,
  className,
}: {
  tx: Transaction;
  onOpen?: (tx: Transaction) => void;
  className?: string;
}) {
  const incoming = tx.direction === "incoming";
  return (
    <div
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={() => onOpen?.(tx)}
      onKeyDown={(e) => {
        if (onOpen && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen(tx);
        }
      }}
      className={cn(
        "flex items-center gap-3.5 rounded-lg border border-border bg-card p-3.5 shadow-xs transition-colors",
        onOpen && "cursor-pointer hover:border-primary/40",
        className
      )}
    >
      <TransactionIcon type={tx.type} direction={tx.direction} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{TRANSACTION_TYPE_META[tx.type].label}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{tx.description}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className={cn("numeric text-sm font-extrabold", incoming ? "text-success" : "text-foreground")}>
              {incoming ? "+" : "−"}
              {formatKES(tx.netAmount)}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{relativeTime(tx.createdAt)}</p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={tx.status} />
          <span className="numeric text-[11px] text-muted-foreground">{tx.reference}</span>
        </div>
      </div>
    </div>
  );
}

export function TransactionTimeline({ events }: { events: TransactionEvent[] }) {
  return (
    <ol className="relative space-y-5 pl-6" aria-label="Transaction timeline">
      <span aria-hidden className="absolute top-2 bottom-2 left-[9px] w-px bg-border" />
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span
            aria-hidden
            className={cn(
              "absolute top-1 -left-6 flex size-[19px] items-center justify-center rounded-full border-2 border-card",
              event.status === "done" && "bg-success",
              event.status === "current" && "bg-warning",
              event.status === "upcoming" && "bg-border"
            )}
          >
            {event.status === "done" && (
              <svg viewBox="0 0 12 12" className="size-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M2.5 6.5 5 9l4.5-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <p className="text-sm font-bold">{event.label}</p>
              <time className="numeric text-[11px] text-muted-foreground" dateTime={event.timestamp}>
                {formatDateTime(event.timestamp)}
              </time>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{event.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function FeeBreakdown({
  rows,
  totalLabel,
  totalValue,
  className,
}: {
  rows: { label: string; value: string; hint?: string }[];
  totalLabel?: string;
  totalValue?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2.5 rounded-lg border border-border bg-muted/40 p-4", className)}>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">{row.label}</span>
          <span className="numeric font-semibold">{row.value}</span>
        </div>
      ))}
      {totalLabel && totalValue && (
        <div className="flex items-center justify-between gap-3 border-t border-border pt-2.5 text-sm">
          <span className="font-bold">{totalLabel}</span>
          <span className="numeric text-base font-extrabold">{totalValue}</span>
        </div>
      )}
    </div>
  );
}

export function InvestmentProgressBar({
  percent,
  daysElapsed,
  daysTotal,
  statusLabel,
  className,
}: {
  percent: number;
  daysElapsed: number;
  daysTotal: number;
  statusLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-success transition-all duration-700"
          style={{ width: `${Math.min(100, Math.max(2, percent))}%` }}
          role="progressbar"
          aria-valuenow={Math.round(percent)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="numeric font-semibold text-foreground">
          Day {Math.min(daysElapsed, daysTotal)} of {daysTotal}
        </span>
        {statusLabel && <span>{statusLabel}</span>}
      </div>
    </div>
  );
}

export function ReceiptPreview({
  reference,
  title,
  amount,
  fee,
  net,
  status,
  date,
  meta,
  className,
}: {
  reference: string;
  title: string;
  amount: string;
  fee?: string;
  net?: string;
  status?: React.ReactNode;
  date: string;
  meta?: { label: string; value: string }[];
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-border bg-card", className)}>
      <div className="gradient-navy relative px-5 py-4 text-white">
        <div className="grid-pattern absolute inset-0 opacity-40" aria-hidden />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-widest text-white/60 uppercase">Zentra receipt</p>
            <p className="mt-0.5 text-base font-extrabold">{title}</p>
          </div>
          {status}
        </div>
      </div>
      <div className="space-y-3 px-5 py-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Amount</span>
          <span className="numeric text-lg font-extrabold">{amount}</span>
        </div>
        {fee && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Fee</span>
            <span className="numeric font-semibold">{fee}</span>
          </div>
        )}
        {net && (
          <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
            <span className="font-bold">Net</span>
            <span className="numeric font-extrabold">{net}</span>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
          <span className="text-muted-foreground">Reference</span>
          <span className="numeric font-semibold">{reference}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Date</span>
          <span className="font-semibold">{date}</span>
        </div>
        {meta?.map((row) => (
          <div key={row.label} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-semibold">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatementDownloadDialog({ onDownload }: { onDownload?: () => void }) {
  return (
    <Badge variant="outline" className="cursor-pointer gap-1.5" onClick={onDownload}>
      Download statement
    </Badge>
  );
}

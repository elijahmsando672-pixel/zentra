import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_META, INVESTMENT_STATUS_META } from "@/lib/constants";
import type { InvestmentStatus, TransactionStatus } from "@/lib/types";

const toneClasses: Record<string, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  neutral: "bg-muted text-muted-foreground",
};

export function StatusBadge({
  status,
  meta,
  className,
  dot = true,
}: {
  status: string;
  meta?: { label: string; tone: string };
  className?: string;
  dot?: boolean;
}) {
  const resolved =
    meta ??
    (STATUS_META as Record<string, { label: string; tone: string }>)[status] ??
    ({ label: status, tone: "neutral" } as const);

  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 border-transparent font-bold", toneClasses[resolved.tone] ?? toneClasses.neutral, className)}
    >
      {dot && (
        <span
          aria-hidden
          className={cn(
            "size-1.5 rounded-full",
            resolved.tone === "success" && "bg-success",
            resolved.tone === "warning" && "bg-warning",
            resolved.tone === "danger" && "bg-danger",
            resolved.tone === "info" && "bg-info",
            resolved.tone === "neutral" && "bg-muted-foreground"
          )}
        />
      )}
      {resolved.label}
    </Badge>
  );
}

export function TransactionStatusBadge({
  status,
  className,
}: {
  status: TransactionStatus;
  className?: string;
}) {
  return <StatusBadge status={status} className={className} />;
}

export function InvestmentStatusBadge({
  status,
  className,
}: {
  status: InvestmentStatus;
  className?: string;
}) {
  return (
    <StatusBadge
      status={status}
      meta={INVESTMENT_STATUS_META[status] as { label: string; tone: string }}
      className={className}
    />
  );
}

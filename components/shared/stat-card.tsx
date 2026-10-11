import * as React from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatPercent } from "@/lib/utils";

export function TrendIndicator({
  value,
  className,
  invert = false,
}: {
  value: number;
  className?: string;
  invert?: boolean;
}) {
  const positive = invert ? value < 0 : value > 0;
  const neutral = value === 0;
  return (
    <span
      className={cn(
        "numeric inline-flex items-center gap-1 text-xs font-bold",
        neutral ? "text-muted-foreground" : positive ? "text-success" : "text-danger",
        className
      )}
    >
      {!neutral && (positive ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />)}
      {formatPercent(value, Math.abs(value) >= 10 ? 0 : 1)}
    </span>
  );
}

export function StatCard({
  label,
  value,
  icon,
  supporting,
  trend,
  trendInvert,
  loading,
  className,
  href,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  supporting?: React.ReactNode;
  trend?: number;
  trendInvert?: boolean;
  loading?: boolean;
  className?: string;
  href?: string;
  accent?: string;
}) {
  const body = (
    <CardContent className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2.5">
          <p className="truncate text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {loading ? (
            <Skeleton className="h-7 w-28" />
          ) : (
            <p className="numeric truncate text-[22px] leading-tight font-extrabold tracking-tight">
              {value}
            </p>
          )}
          {(supporting || trend !== undefined) && !loading && (
            <div className="flex flex-wrap items-center gap-2">
              {trend !== undefined && <TrendIndicator value={trend} invert={trendInvert} />}
              {supporting && (
                <span className="truncate text-xs text-muted-foreground">{supporting}</span>
              )}
            </div>
          )}
          {loading && <Skeleton className="h-3 w-20" />}
        </div>
        {icon && (
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-md"
            style={accent ? { backgroundColor: `${accent}18`, color: accent } : undefined}
          >
            {icon}
          </div>
        )}
      </div>
    </CardContent>
  );

  if (href) {
    return (
      <Card className={cn("group transition-all hover:shadow-md hover:-translate-y-0.5", accent && `border-t-2`)}>
        <a href={href} className="block focus-visible:outline-none">
          {body}
        </a>
      </Card>
    );
  }

  return (
    <Card className={cn("group transition-all hover:shadow-md", accent && "border-t-2")}>
      {body}
    </Card>
  );
}

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Clock, Layers, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn, formatCompactKES, formatKES, formatNumber } from "@/lib/utils";
import { ICON_MAP, PRODUCT_TIERS } from "@/lib/constants";
import type { Product } from "@/lib/types";

const tierAccent: Record<string, string> = {
  starter: "#18B97A",
  growth: "#C8F24A",
  elite: "#F5B942",
};

const badgeMeta: Record<NonNullable<Product["badge"]>, { label: string; className: string }> = {
  popular: { label: "Popular", className: "bg-primary text-brand-deep" },
  limited: { label: "Limited", className: "bg-gold text-gold-foreground" },
  new: { label: "New", className: "bg-info text-white" },
  sold_out: { label: "Sold out", className: "bg-muted text-muted-foreground" },
};

export function ProductBadge({ badge }: { badge?: Product["badge"] }) {
  if (!badge) return null;
  const meta = badgeMeta[badge];
  return (
    <Badge className={cn("border-transparent", meta.className)}>{meta.label}</Badge>
  );
}

export function CapacityProgress({ product, className }: { product: Product; className?: string }) {
  const pct = Math.min(100, Math.round((product.capacityUsed / product.capacityTotal) * 100));
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">Capacity</span>
        <span className="numeric font-bold">{pct}% filled</span>
      </div>
      <Progress
        value={pct}
        indicatorClassName={pct >= 100 ? "bg-muted-foreground" : pct > 80 ? "bg-warning" : "bg-primary"}
      />
    </div>
  );
}

export function ProductIcon({
  icon,
  tier,
  className,
}: {
  icon: Product["icon"];
  tier: Product["tier"];
  className?: string;
}) {
  const Icon = ICON_MAP[icon];
  const accent = tierAccent[tier];
  return (
    <span
      className={cn("flex size-12 items-center justify-center rounded-md", className)}
      style={{ backgroundColor: `${accent}1f`, color: accent === "#C8F24A" ? "#071426" : accent }}
    >
      <Icon className="size-6" />
    </span>
  );
}

export function ProductCard({
  product,
  onInvest,
  href,
  guest = false,
  className,
}: {
  product: Product;
  onInvest?: (product: Product) => void;
  href?: string;
  guest?: boolean;
  className?: string;
}) {
  const detailHref = href ?? `/dashboard/products/${product.slug}`;
  const soldOut = product.status === "sold_out";
  const paused = product.status === "paused";
  const disabled = soldOut || paused;
  const accent = tierAccent[product.tier];

  return (
    <Card className={cn("group flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md", className)}>
      <CardContent className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <ProductIcon icon={product.icon} tier={product.tier} />
          <div className="flex flex-col items-end gap-1.5">
            <ProductBadge badge={product.badge} />
            <Badge variant="outline" className="text-[10px]">
              {PRODUCT_TIERS[product.tier].label}
            </Badge>
          </div>
        </div>

        <div className="space-y-1.5">
          <Link href={detailHref} className="block">
            <h3 className="text-base font-extrabold tracking-tight transition-colors group-hover:text-brand-navy dark:group-hover:text-primary">
              {product.name}
            </h3>
          </Link>
          <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">{product.tagline}</p>
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-md border border-border bg-muted/40 p-3">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Entry from</dt>
            <dd className="numeric mt-0.5 text-sm font-extrabold">{formatCompactKES(product.minEntry)}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Duration</dt>
            <dd className="numeric mt-0.5 text-sm font-extrabold">{product.durationDays} days</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Daily earning*</dt>
            <dd className="numeric mt-0.5 text-sm font-extrabold" style={{ color: accent === "#C8F24A" ? undefined : accent }}>
              {formatKES(product.dailyEarningAtEntry)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total payout*</dt>
            <dd className="numeric mt-0.5 text-sm font-extrabold">
              {formatCompactKES(product.minEntry * product.totalPayoutMultiplier)}
            </dd>
          </div>
        </dl>

        <CapacityProgress product={product} />

        <div className="mt-auto flex items-center gap-2 pt-1">
          {guest ? (
            <Button asChild className="flex-1">
              <Link href="/register">
                Get started
                <ArrowRight />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="outline" className="flex-1">
                <Link href={detailHref}>
                  Details
                  <ArrowRight />
                </Link>
              </Button>
              {onInvest ? (
                <Button
                  className="flex-1"
                  disabled={disabled}
                  onClick={() => onInvest(product)}
                  title={soldOut ? "This plan is at full capacity" : paused ? "This plan is paused" : undefined}
                >
                  {soldOut ? "Sold out" : paused ? "Paused" : "Invest"}
                </Button>
              ) : (
                <Button asChild className="flex-1" disabled={disabled}>
                  <Link href={detailHref}>{soldOut ? "Sold out" : paused ? "Paused" : "Invest"}</Link>
                </Button>
              )}
            </>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">*Illustrative projection based on the selected entry amount.</p>
      </CardContent>
    </Card>
  );
}

export function ProductCalculator({ product }: { product: Product }) {
  const [amount, setAmount] = React.useState(product.minEntry);
  const clamped = Math.min(product.maxEntry, Math.max(product.minEntry, amount));
  const daily = Number(((clamped * product.dailyRate) / 100).toFixed(2));
  const total = Number((daily * product.durationDays).toFixed(2));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="calc-amount" className="text-sm font-semibold">
          Entry amount
        </label>
        <input
          id="calc-amount"
          type="range"
          min={product.minEntry}
          max={product.maxEntry}
          step={product.stepAmount}
          value={clamped}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full accent-[#071426] dark:accent-[#c8f24a]"
          aria-valuetext={`${clamped} shillings`}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="numeric">{formatCompactKES(product.minEntry)}</span>
          <span className="numeric text-base font-extrabold text-foreground">{formatKES(clamped, { decimals: 0 })}</span>
          <span className="numeric">{formatCompactKES(product.maxEntry)}</span>
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-3">
        <div className="rounded-md border border-border bg-muted/40 p-3 text-center">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Daily</dt>
          <dd className="numeric mt-1 text-sm font-extrabold">{formatKES(daily)}</dd>
        </div>
        <div className="rounded-md border border-border bg-muted/40 p-3 text-center">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <Clock className="mr-1 inline size-3" />
            Days
          </dt>
          <dd className="numeric mt-1 text-sm font-extrabold">{product.durationDays}</dd>
        </div>
        <div className="rounded-md border border-border bg-muted/40 p-3 text-center">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <TrendingUp className="mr-1 inline size-3" />
            Total*
          </dt>
          <dd className="numeric mt-1 text-sm font-extrabold text-success">{formatKES(total)}</dd>
        </div>
      </dl>
      <div className="flex items-center gap-2 rounded-md border border-info/25 bg-info-soft p-3 text-xs text-info">
        <Layers className="size-4 shrink-0" />
        <p>
          Total projected payout of{" "}
          <span className="numeric font-bold">{formatKES(clamped + total)}</span> over {product.durationDays} days.
          Illustrative only.
        </p>
      </div>
    </div>
  );
}

export function ProductTierChip({ tier }: { tier: Product["tier"] }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold"
      style={{ backgroundColor: `${tierAccent[tier]}1f`, color: tierAccent[tier] === "#C8F24A" ? "#071426" : tierAccent[tier] }}
    >
      {PRODUCT_TIERS[tier].label}
    </span>
  );
}

export { formatNumber };

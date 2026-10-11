"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Layers, Sparkles, Star, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { ProductCard } from "@/components/products/product-components";
import { getProducts } from "@/lib/services/products";
import { PRODUCT_TIERS } from "@/lib/constants";
import { useApiQuery } from "@/hooks/use-api";

const tierCopy: Record<
  keyof typeof PRODUCT_TIERS,
  { icon: typeof Star; description: string; points: string[] }
> = {
  starter: {
    icon: Zap,
    description:
      "Low entry plans for trying the platform. Small daily earnings, short commitments and plenty of room to learn the flow.",
    points: ["Accessible entry amounts", "Shorter durations", "Ideal for a first plan"],
  },
  growth: {
    icon: Layers,
    description:
      "Balanced plans for members building momentum. Stronger daily earnings across a medium-term commitment.",
    points: ["Mid-range entry amounts", "Balanced daily rates", "Popular with members"],
  },
  elite: {
    icon: Star,
    description:
      "Premium plans with the highest illustrative daily earnings and larger capacity for committed members.",
    points: ["Higher entry amounts", "Top illustrative rates", "Limited capacities"],
  },
};

export default function ProductsPage() {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useApiQuery(["public-products", 1, 50], () => getProducts({ page: 1, pageSize: 50 }));

  const products = data?.items ?? [];

  return (
    <div>
      <section className="gradient-hero relative overflow-hidden border-b border-border">
        <div className="grid-pattern absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-5">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                Product catalogue
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight text-balance text-white sm:text-5xl">
                Investment plans for every stage
              </h1>
              <p className="text-sm leading-relaxed text-white/70 sm:text-base">
                Browse available plans. Every plan publishes its entry range, duration,
                daily earning and capacity so you can compare in seconds.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <DemoDataBadge />
              <Button asChild size="lg">
                <Link href="/register">
                  Create an account to invest
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              All plans
            </p>
            <h2 className="text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">
              {isLoading ? "Loading plans" : `${data?.total ?? 0} plans available`}
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Some displayed figures are illustrative. Check each plan's terms before committing funds.
            </p>
          </div>
          <Badge variant="info">Illustrative projections</Badge>
        </div>

        {error ? (
          <ErrorState
            title="Catalogue unavailable"
            description={error.message}
            onRetry={() => refetch()}
          />
        ) : isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} lines={5} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            title="No plans available"
            description="There are no products matching this view right now. Please check back soon."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} guest />
            ))}
          </div>
        )}
      </section>

      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mb-8 space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Tiers explained
            </p>
            <h2 className="text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">
              Three tiers, one clear ladder
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Plans are grouped into tiers so you can quickly find the commitment level that fits
              your goal.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ["starter", PRODUCT_TIERS.starter],
                ["growth", PRODUCT_TIERS.growth],
                ["elite", PRODUCT_TIERS.elite],
              ] as const
            ).map(([key, meta]) => {
              const copy = tierCopy[key];
              return (
                <Card key={key} className="shadow-xs">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex size-11 items-center justify-center rounded-md bg-primary/15 text-primary">
                        <copy.icon className="size-5" />
                      </span>
                      <Badge variant="secondary">{meta.label} tier</Badge>
                    </div>
                    <h3 className="text-base font-extrabold tracking-tight">{meta.label} plans</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {copy.description}
                    </p>
                    <ul className="space-y-2">
                      {copy.points.map((point) => (
                        <li
                          key={point}
                          className="flex items-start gap-2.5 text-sm text-muted-foreground"
                        >
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-lg border border-border bg-card p-6 shadow-xs sm:flex-row sm:items-center">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Invest with an account
                </p>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Create a free account to activate plans, track daily earnings and manage
                withdrawals. Payment availability depends on the enabled method and provider status.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button asChild variant="outline">
                <Link href="/how-it-works">See how it works</Link>
              </Button>
              <Button asChild>
                <Link href="/register">
                  Create free account
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

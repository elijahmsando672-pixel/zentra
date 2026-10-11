"use client";

import { useEffect, useState } from "react";
import { ArrowUpDown, Package, Sparkles, Wallet } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { SearchInput } from "@/components/shared/search-input";
import { ProductCard } from "@/components/products/product-components";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApiQuery } from "@/hooks/use-api";
import { getProducts, type ProductQuery } from "@/lib/services/products";
import { PRODUCT_TIERS } from "@/lib/constants";
import { formatCompactKES, formatPercent } from "@/lib/utils";
import type { ProductStatus, ProductTier } from "@/lib/types";

const SORT_OPTIONS: { value: Required<ProductQuery>["sort"]; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "entry_asc", label: "Entry: low to high" },
  { value: "entry_desc", label: "Entry: high to low" },
  { value: "duration_asc", label: "Duration: shortest" },
  { value: "duration_desc", label: "Duration: longest" },
  { value: "newest", label: "Newest" },
];

const STATUS_OPTIONS: { value: ProductStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "sold_out", label: "Sold out" },
  { value: "retired", label: "Retired" },
];

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [tier, setTier] = useState<ProductTier | "all">("all");
  const [status, setStatus] = useState<ProductStatus | "all">("all");
  const [sort, setSort] = useState<ProductQuery["sort"]>("recommended");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const query: ProductQuery = {
    search: debounced || undefined,
    tier,
    status,
    sort,
    pageSize: 60,
  };

  const { data, isLoading, error, refetch } = useApiQuery(
    ["products", query],
    () => getProducts(query)
  );

  const items = data?.items ?? [];
  const lowestEntry = items.length > 0 ? Math.min(...items.map((p) => p.minEntry)) : 0;
  const highestRate = items.length > 0 ? Math.max(...items.map((p) => p.dailyRate)) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Member plans with projected daily earnings, maturity payouts and fixed durations. Projections are estimates, not guaranteed returns."
        actions={<DemoDataBadge />}
      />

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Package className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Plans available
              </p>
              <p className="numeric text-lg font-extrabold">{data?.total ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-success-soft text-success">
              <Wallet className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Lowest entry
              </p>
              <p className="numeric text-lg font-extrabold">
                {lowestEntry ? formatCompactKES(lowestEntry) : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-gold-soft text-gold">
              <Sparkles className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Top daily rate
              </p>
              <p className="numeric text-lg font-extrabold">
                {highestRate ? formatPercent(highestRate, 1) : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search products…"
          className="lg:max-w-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Select value={tier} onValueChange={(v) => setTier(v as ProductTier | "all")}>
            <SelectTrigger className="w-[150px]" aria-label="Filter by tier">
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tiers</SelectItem>
              <SelectItem value="starter">{PRODUCT_TIERS.starter.label}</SelectItem>
              <SelectItem value="growth">{PRODUCT_TIERS.growth.label}</SelectItem>
              <SelectItem value="elite">{PRODUCT_TIERS.elite.label}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as ProductStatus | "all")}>
            <SelectTrigger className="w-[150px]" aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as ProductQuery["sort"])}>
            <SelectTrigger className="w-[190px]" aria-label="Sort products">
              <ArrowUpDown />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        {debounced && (
          <Badge variant="outline" className="border-border font-normal">
            “{debounced}”
          </Badge>
        )}
        {isLoading ? (
          <span>Loading products…</span>
        ) : (
          <span className="numeric font-semibold text-foreground">
            {data?.total ?? 0}
          </span>
        )}
        <span>{data && data.total === 1 ? "plan" : "plans"} matching your filters</span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} lines={6} />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Could not load products"
          description={error.message}
          onRetry={() => void refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="No products match your filters"
          description="Try clearing the search or widening your filters to see more plans."
          action={
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setDebounced("");
                setTier("all");
                setStatus("all");
                setSort("recommended");
              }}
              className="text-sm font-semibold text-primary underline underline-offset-4"
            >
              Reset filters
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Eye, Package, PauseCircle, PlayCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { ProductIcon, ProductTierChip } from "@/components/products/product-components";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useApiQuery } from "@/hooks/use-api";
import { getProducts } from "@/lib/services/products";
import { updateProductStatus } from "@/lib/services/admin";
import { toast } from "sonner";
import { PRODUCT_TIERS } from "@/lib/constants";
import { formatCompactKES, formatDateTime, formatKES } from "@/lib/utils";
import type { Product, ProductStatus, ProductTier } from "@/lib/types";

const PAGE_SIZE = 20;

const PRODUCT_STATUS_META: Record<string, { label: string; tone: string }> = {
  active: { label: "Active", tone: "success" },
  paused: { label: "Paused", tone: "warning" },
  sold_out: { label: "Sold out", tone: "danger" },
  retired: { label: "Retired", tone: "neutral" },
  draft: { label: "Draft", tone: "neutral" },
};

function capacityPercent(product: Product) {
  if (product.capacityTotal <= 0) return 0;
  return Math.min(100, Math.round((product.capacityUsed / product.capacityTotal) * 100));
}

function Pager({
  page,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="numeric text-xs text-muted-foreground">
        Showing {from}–{to} of {total} plans
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label="Previous page"
        >
          Previous
        </Button>
        <span className="numeric text-xs font-semibold text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          aria-label="Next page"
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default function AdminProductsPage() {
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [tier, setTier] = React.useState<ProductTier | "all">("all");
  const [status, setStatus] = React.useState<ProductStatus | "all">("all");
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<Product | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  React.useEffect(() => {
    setPage(1);
  }, [debounced, tier, status]);

  const products = useApiQuery(
    ["admin", "products", "list", debounced, tier, status, page],
    () => getProducts({ search: debounced || undefined, tier, status, page, pageSize: PAGE_SIZE })
  );

  const stats = useApiQuery(["admin", "products", "stats"], () => getProducts({ pageSize: 500 }));

  const changeProductStatus = async (product: Product, nextStatus: ProductStatus) => {
    const result = await updateProductStatus(product.id, nextStatus);
    if (!result.ok) { toast.error(result.message); return; }
    toast.success(`${product.name} is now ${nextStatus.replace("_", " ")}.`);
    setSelected((current) => current?.id === product.id ? result.data : current);
    await Promise.all([products.refetch(), stats.refetch()]);
  };

  const allItems = stats.data?.items ?? [];
  const activeCount = allItems.filter((p) => p.status === "active").length;
  const pausedCount = allItems.filter((p) => p.status === "paused").length;
  const avgRate = allItems.length
    ? allItems.reduce((sum, p) => sum + p.dailyRate, 0) / allItems.length
    : 0;

  const columns: DataTableColumn<Product>[] = [
    {
      key: "product",
      header: "Product",
      primary: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <ProductIcon icon={row.icon} tier={row.tier} className="size-10" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{row.name}</p>
            <p className="numeric truncate text-xs text-muted-foreground">{row.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} meta={PRODUCT_STATUS_META[row.status]} />,
    },
    {
      key: "tier",
      header: "Tier",
      render: (row) => <ProductTierChip tier={row.tier} />,
    },
    {
      key: "entry",
      header: "Entry range",
      render: (row) => (
        <span className="numeric text-xs">
          {formatCompactKES(row.minEntry)} – {formatCompactKES(row.maxEntry)}
        </span>
      ),
    },
    {
      key: "duration",
      header: "Duration",
      render: (row) => <span className="numeric text-xs">{row.durationDays} days</span>,
    },
    {
      key: "rate",
      header: "Daily rate",
      render: (row) => <span className="numeric text-xs font-bold text-success">{row.dailyRate}%</span>,
    },
    {
      key: "payout",
      header: "Payout",
      hideOnMobile: true,
      render: (row) => <span className="numeric text-xs">×{row.totalPayoutMultiplier.toFixed(2)}</span>,
    },
    {
      key: "capacity",
      header: "Capacity",
      render: (row) => (
        <div className="w-36 space-y-1.5">
          <Progress value={capacityPercent(row)} />
          <p className="numeric text-[10px] text-muted-foreground">
            {capacityPercent(row)}% · {formatCompactKES(row.capacityUsed)}
          </p>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={() => setSelected(row)} aria-label={`View ${row.name}`}>
            <Eye />
            View
          </Button>
          {row.status === "active" ? (
            <Button variant="outline" size="sm" onClick={() => void changeProductStatus(row, "paused")}><PauseCircle className="size-4" />Pause</Button>
          ) : row.status === "paused" ? (
            <Button variant="outline" size="sm" onClick={() => void changeProductStatus(row, "active")}><PlayCircle className="size-4" />Resume</Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Investment plans, pricing, capacity, and catalogue status."
        actions={<DemoDataBadge />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total plans"
          value={stats.isLoading ? undefined : stats.data?.total ?? "—"}
          loading={stats.isLoading}
          icon={<Package className="size-5" />}
          supporting="In the catalogue"
        />
        <StatCard
          label="Active"
          value={activeCount}
          loading={stats.isLoading}
          supporting="Open for commitments"
        />
        <StatCard
          label="Paused"
          value={pausedCount}
          loading={stats.isLoading}
          supporting="Temporarily closed"
        />
        <StatCard
          label="Avg daily rate"
          value={stats.isLoading ? undefined : `${avgRate.toFixed(2)}%`}
          loading={stats.isLoading}
          supporting="Across all plans"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search plans by name or description"
          className="sm:max-w-sm sm:flex-1"
        />
        <div className="flex flex-wrap gap-2">
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
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="sold_out">Sold out</SelectItem>
              <SelectItem value="retired">Retired</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {products.isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : products.error ? (
        <ErrorState
          title="Could not load products"
          description={products.error.message}
          onRetry={() => void products.refetch()}
        />
      ) : products.data && products.data.items.length > 0 ? (
        <div className="space-y-4">
          <DataTable
            columns={columns}
            rows={products.data.items}
            keyExtractor={(row) => row.id}
            onRowClick={(row) => setSelected(row)}
          />
          <Pager page={products.data.page} total={products.data.total} pageSize={products.data.pageSize} onPage={setPage} />
        </div>
      ) : (
        <EmptyState
          title="No plans found"
          description="No products match the current search and filters."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setTier("all");
                setStatus("all");
              }}
            >
              Reset filters
            </Button>
          }
        />
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <ProductIcon icon={selected.icon} tier={selected.tier} className="size-11" />
                  <span>
                    {selected.name}
                    <span className="numeric block text-xs font-normal text-muted-foreground">
                      {selected.slug}
                    </span>
                  </span>
                </DialogTitle>
                <DialogDescription>{selected.tagline}</DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap items-center gap-2">
                <ProductTierChip tier={selected.tier} />
                <StatusBadge status={selected.status} meta={PRODUCT_STATUS_META[selected.status]} />
                {selected.featured && <Badge variant="gold">Featured</Badge>}
                {selected.badge && <Badge variant="secondary">{selected.badge.replace("_", " ")}</Badge>}
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">{selected.description}</p>

              <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 sm:grid-cols-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Min entry</p>
                  <p className="numeric mt-0.5 text-sm font-extrabold">{formatKES(selected.minEntry, { decimals: 0 })}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Max entry</p>
                  <p className="numeric mt-0.5 text-sm font-extrabold">{formatKES(selected.maxEntry, { decimals: 0 })}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Step amount</p>
                  <p className="numeric mt-0.5 text-sm font-extrabold">{formatKES(selected.stepAmount, { decimals: 0 })}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Duration</p>
                  <p className="numeric mt-0.5 text-sm font-extrabold">{selected.durationDays} days</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Daily rate</p>
                  <p className="numeric mt-0.5 text-sm font-extrabold text-success">{selected.dailyRate}%</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Daily earning at entry
                  </p>
                  <p className="numeric mt-0.5 text-sm font-extrabold">
                    {formatKES(selected.dailyEarningAtEntry, { decimals: 0 })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payout multiplier</p>
                  <p className="numeric mt-0.5 text-sm font-extrabold">×{selected.totalPayoutMultiplier.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Icon key</p>
                  <p className="numeric mt-0.5 text-sm font-extrabold">{selected.icon}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Version</p>
                  <p className="numeric mt-0.5 text-sm font-extrabold">v{selected.version}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Capacity used
                  </p>
                  <span className="numeric text-xs font-bold">
                    {formatCompactKES(selected.capacityUsed)} / {formatCompactKES(selected.capacityTotal)} (
                    {capacityPercent(selected)}%)
                  </span>
                </div>
                <Progress value={capacityPercent(selected)} />
              </div>

              <Separator />

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Terms</p>
                  <ul className="space-y-1.5">
                    {selected.terms.map((term) => (
                      <li key={term} className="flex gap-2 text-xs leading-relaxed">
                        <span className="text-primary">·</span>
                        <span>{term}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Eligibility</p>
                  <ul className="space-y-1.5">
                    {selected.eligibility.map((rule) => (
                      <li key={rule} className="flex gap-2 text-xs leading-relaxed">
                        <span className="text-primary">·</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-warning-soft/50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-warning">Risk note</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{selected.riskNote}</p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  Created <span title={formatDateTime(selected.createdAt)}>{formatDateTime(selected.createdAt)}</span>
                </span>
                <span className="numeric">{selected.faq.length} FAQs</span>
              </div>

              <DialogFooter className="border-t border-border pt-4">
                {selected.status === "active" ? (
                  <Button variant="outline" onClick={() => void changeProductStatus(selected, "paused")}><PauseCircle className="size-4" />Pause plan</Button>
                ) : (
                  <Button variant="outline" onClick={() => void changeProductStatus(selected, "active")}><PlayCircle className="size-4" />Resume plan</Button>
                )}
                <Button asChild variant="ghost">
                  <Link href={`/products/${selected.slug}`}>
                    Public view
                    <ArrowRight />
                  </Link>
                </Button>
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

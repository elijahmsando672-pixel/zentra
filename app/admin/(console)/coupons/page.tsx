"use client";

import { useState } from "react";
import { CalendarClock, Gift, Plus, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { CopyButton } from "@/components/shared/copy-button";
import { FieldError, CurrencyInput } from "@/components/forms/form-inputs";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useApiQuery } from "@/hooks/use-api";
import { getAdminCoupons, createCoupon, setCouponActive } from "@/lib/services/admin";
import { cn, formatKES, formatPercent, formatShortDate, parseAmountToNumber, relativeTime } from "@/lib/utils";
import { toast } from "sonner";
import type { Coupon } from "@/lib/types";

const TYPE_META: Record<Coupon["type"], { label: string; variant: "info" | "success" | "warning" | "gold"; percentValue: boolean }> = {
  bonus_percent: { label: "Bonus %", variant: "info", percentValue: true },
  bonus_flat: { label: "Bonus", variant: "gold", percentValue: false },
  fee_waiver: { label: "Fee waiver", variant: "success", percentValue: false },
  cashback: { label: "Cashback", variant: "warning", percentValue: true },
};

function couponValue(coupon: Coupon) {
  const meta = TYPE_META[coupon.type];
  return meta.percentValue ? formatPercent(coupon.value, 1) : formatKES(coupon.value);
}

function isExpired(coupon: Coupon) {
  return new Date(coupon.expiresAt) < new Date();
}

function CouponStatusBadge({ coupon }: { coupon: Coupon }) {
  if (isExpired(coupon)) {
    return <Badge variant="danger">Expired</Badge>;
  }
  return coupon.active ? (
    <Badge variant="success">Active</Badge>
  ) : (
    <Badge variant="outline">Inactive</Badge>
  );
}

function generateCode() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `NX${rand}`;
}

const EMPTY_FORM = { code: "", title: "", description: "", type: "bonus_percent" as Coupon["type"], value: "", maxRedemption: "", expiresAt: "" };

export default function CouponsPage() {
  const { data, isLoading, error, refetch } = useApiQuery(["admin", "coupons"], getAdminCoupons);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const coupons = data ?? [];

  const openDialog = () => {
    setForm(EMPTY_FORM);
    setForm((f) => ({ ...f, code: generateCode() }));
    setFieldErrors({});
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!form.code.trim()) errors.code = "Enter a coupon code.";
    if (!form.title.trim()) errors.title = "Enter a title.";
    const value = parseAmountToNumber(form.value);
    if (!(value > 0)) errors.value = "Enter a value above zero.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    const res = await createCoupon({
      code: form.code.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
      value,
      type: form.type,
      maxRedemption: form.maxRedemption ? Number(form.maxRedemption) : undefined,
      expiresAt: form.expiresAt || undefined,
    });
    setSaving(false);

    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success(`Coupon ${res.data.code} created`);
    setOpen(false);
    void refetch();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coupons"
        description="Promo codes that add bonus value, cashback or fee waivers. Redemption caps and expiry are enforced in the member app."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Coupons" }]}
        actions={
          <>
            <DemoDataBadge />
            <Button onClick={openDialog}>
              <Plus />
              Create coupon
            </Button>
          </>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} lines={5} />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Could not load coupons"
          description={error.message}
          onRetry={() => void refetch()}
        />
      ) : coupons.length === 0 ? (
        <EmptyState
          title="No coupons yet"
          description="Create your first promotional code to get started."
          action={
            <Button onClick={openDialog}>
              <Plus />
              Create coupon
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {coupons.map((coupon) => {
            const meta = TYPE_META[coupon.type];
            const progress = coupon.maxRedemption
              ? Math.min(100, (coupon.redemptions / coupon.maxRedemption) * 100)
              : coupon.redemptions > 0
                ? Math.min(100, coupon.redemptions)
                : 0;
            return (
              <Card key={coupon.id} className={cn("flex flex-col", !coupon.active && "opacity-70")}>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="numeric flex items-center gap-1 truncate text-sm font-extrabold">
                      {coupon.code}
                      <CopyButton value={coupon.code} label={`Copy ${coupon.code}`} size="icon-sm" />
                    </p>
                    <CardTitle className="mt-1 truncate">{coupon.title}</CardTitle>
                  </div>
                  <CouponStatusBadge coupon={coupon} />
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                    <span className="numeric text-lg font-extrabold">{couponValue(coupon)}</span>
                  </div>
                  <p className="line-clamp-2 flex-1 text-xs text-muted-foreground leading-relaxed">
                    {coupon.description}
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {coupon.maxRedemption ? "Redemptions" : "Times used"}
                      </span>
                      <span className="numeric font-bold">
                        {coupon.redemptions}
                        {coupon.maxRedemption ? ` / ${coupon.maxRedemption}` : ""}
                      </span>
                    </div>
                    {coupon.maxRedemption ? (
                      <Progress
                        value={progress}
                        indicatorClassName={
                          progress >= 100 ? "bg-danger" : progress >= 80 ? "bg-warning" : "bg-primary"
                        }
                      />
                    ) : (
                      <Progress value={progress} indicatorClassName="bg-primary" />
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-border pt-3 text-xs">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <CalendarClock className="size-3.5" />
                      <span
                        className={cn(
                          "font-semibold",
                          isExpired(coupon) ? "text-danger" : "text-foreground"
                        )}
                      >
                        {relativeTime(coupon.expiresAt)}
                      </span>
                      <span className="text-muted-foreground">· {formatShortDate(coupon.expiresAt)}</span>
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm" onClick={async () => { const result = await setCouponActive(coupon.id, !coupon.active); if (!result.ok) toast.error(result.message); else toast.success(`Coupon ${result.data.active ? "activated" : "deactivated"}.`); }}
                            aria-label="Toggle coupon active state"
                          >
                            <Gift />
                            {coupon.active ? "Deactivate" : "Activate"}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        Toggle coupon availability.</TooltipContent>
                    </Tooltip>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl" aria-describedby="create-coupon-description">
          <DialogHeader>
            <DialogTitle>Create coupon</DialogTitle>
            <DialogDescription id="create-coupon-description">
              A new code is issued to members in the rewards section once active.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="coupon-code">Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="coupon-code"
                    value={form.code}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "") }))
                    }
                    className="numeric font-bold uppercase"
                    placeholder="KARIBU500"
                    maxLength={16}
                    aria-invalid={!!fieldErrors.code}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setForm((f) => ({ ...f, code: generateCode() }))}
                    aria-label="Generate a random code"
                  >
                    <Wand2 />
                  </Button>
                </div>
                <FieldError message={fieldErrors.code} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-type">Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v as Coupon["type"] }))}
                >
                  <SelectTrigger id="coupon-type" aria-label="Coupon type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(TYPE_META) as [Coupon["type"], { label: string }][]).map(
                      ([key, m]) => (
                        <SelectItem key={key} value={key}>
                          {m.label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="coupon-title">Title</Label>
                <Input
                  id="coupon-title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Karibu Bonus"
                  aria-invalid={!!fieldErrors.title}
                />
                <FieldError message={fieldErrors.title} />
              </div>
              <div className="space-y-2">
                {TYPE_META[form.type].percentValue ? (
                  <div className="space-y-2">
                    <Label htmlFor="coupon-value">Value (%)</Label>
                    <Input
                      id="coupon-value"
                      type="number"
                      step="any"
                      min="0"
                      value={form.value}
                      onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                      className="numeric"
                      placeholder="2"
                      aria-invalid={!!fieldErrors.value}
                    />
                  </div>
                ) : (
                  <CurrencyInput
                    value={form.value}
                    onChange={(v) => setForm((f) => ({ ...f, value: v }))}
                    label="Value (KES)"
                    error={fieldErrors.value}
                    id="coupon-value"
                  />
                )}
                {TYPE_META[form.type].percentValue && <FieldError message={fieldErrors.value} />}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="coupon-description">Description</Label>
              <Textarea
                id="coupon-description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Bonus on your first qualifying deposit…"
                className="min-h-20"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="coupon-max-redemption">Max redemptions</Label>
                <Input
                  id="coupon-max-redemption"
                  type="number"
                  min="0"
                  value={form.maxRedemption}
                  onChange={(e) => setForm((f) => ({ ...f, maxRedemption: e.target.value }))}
                  className="numeric"
                  placeholder="Unlimited"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-expiry">Expiry</Label>
                <Input
                  id="coupon-expiry"
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                />
              </div>
            </div>

            <p className="rounded-md bg-muted px-3 py-2.5 text-xs text-muted-foreground">Coupon expiry and redemption limits are stored with the code and apply to member redemptions.</p>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Creating…" : "Create coupon"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

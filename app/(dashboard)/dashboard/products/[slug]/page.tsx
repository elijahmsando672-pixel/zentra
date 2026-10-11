"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Info, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { CardSkeleton, ErrorState } from "@/components/shared/states";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import {
  CapacityProgress,
  ProductBadge,
  ProductCalculator,
  ProductIcon,
  ProductTierChip,
} from "@/components/products/product-components";
import { FeeBreakdown } from "@/components/financial/financial";
import { CurrencyInput, FieldError } from "@/components/forms/form-inputs";
import { TransactionPinInput } from "@/components/forms/code-inputs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
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
import { WALLET_META, DEMO_TRANSACTION_PIN } from "@/lib/constants";
import { StatusBadge } from "@/components/shared/status-badge";
import { useApiQuery } from "@/hooks/use-api";
import { createInvestment } from "@/lib/services/investments";
import { getProductBySlug } from "@/lib/services/products";
import { getWallets } from "@/lib/services/wallet";
import { formatDateTime, formatKES, formatPercent } from "@/lib/utils";
import type { Product, ProductStatus, WalletType } from "@/lib/types";

const PRODUCT_STATUS_META: Record<ProductStatus, { label: string; tone: string }> = {
  active: { label: "Active", tone: "success" },
  paused: { label: "Paused", tone: "warning" },
  sold_out: { label: "Sold out", tone: "neutral" },
  retired: { label: "Retired", tone: "neutral" },
  draft: { label: "Draft", tone: "neutral" },
};

const HOW_IT_WORKS = [
  {
    question: "How are daily earnings credited?",
    answer:
      "Each day your entry amount earns the rate displayed for the plan, credited to your Earnings Wallet according to the schedule. Figures are projections and may differ from actual outcomes.",
  },
  {
    question: "What happens at maturity?",
    answer:
      "At maturity, the payout is handled according to the plan terms. Projected amounts are estimates and are not guaranteed.",
  },
  {
    question: "Can I exit early?",
    answer:
      "This plan is fixed-term. Early cancellation is not available; commitments run until maturity.",
  },
];

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = React.use(params);
  const router = useRouter();
  const { data: product, isLoading, error, refetch } = useApiQuery(
    ["product", slug],
    () => getProductBySlug(slug)
  );

  const [open, setOpen] = React.useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Products", href: "/dashboard/products" },
          { label: product?.name ?? "Product" },
        ]}
        actions={<DemoDataBadge />}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <CardSkeleton className="lg:col-span-2" lines={8} />
          <CardSkeleton lines={6} />
        </div>
      ) : error || !product ? (
        <ErrorState
          title="Could not load this product"
          description={error?.message ?? "The plan you are looking for may have been removed."}
          onRetry={() => void refetch()}
        />
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start">
              <ProductIcon icon={product.icon} tier={product.tier} className="size-14" />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-extrabold tracking-tight">{product.name}</h2>
                      <ProductTierChip tier={product.tier} />
                      <StatusBadge status={product.status} meta={PRODUCT_STATUS_META[product.status]} />
                      <ProductBadge badge={product.badge} />
                    </div>
                    <p className="text-sm text-muted-foreground">{product.tagline}</p>
                  </div>
                  {product.featured && (
                    <Badge variant="secondary" className="bg-primary/15 text-primary">
                      Featured
                    </Badge>
                  )}
                </div>
                <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed">
                  {product.description}
                </p>
              </div>
            </CardContent>
          </Card>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Min entry
              </dt>
              <dd className="numeric mt-1 text-lg font-extrabold">{formatKES(product.minEntry, { decimals: 0 })}</dd>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Duration
              </dt>
              <dd className="numeric mt-1 text-lg font-extrabold">{product.durationDays} days</dd>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Daily earning*
              </dt>
              <dd className="numeric mt-1 text-lg font-extrabold text-success">
                {formatKES(product.dailyEarningAtEntry)}
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Total payout*
              </dt>
              <dd className="numeric mt-1 text-lg font-extrabold">
                {formatPercent((product.totalPayoutMultiplier - 1) * 100, 0)}
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Daily rate
              </dt>
              <dd className="numeric mt-1 text-lg font-extrabold">{formatPercent(product.dailyRate, 1)}</dd>
            </div>
          </dl>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card>
                  <CardContent className="space-y-4 p-6">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider">Projection calculator</h3>
                    <ProductCalculator product={product} />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="space-y-4 p-6">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider">Terms</h3>
                    <ul className="space-y-2.5">
                      {product.terms.map((term) => (
                        <li key={term} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                          <span className="leading-relaxed">{term}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="space-y-4 p-6">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider">How earnings work</h3>
                  <Accordion type="single" collapsible className="w-full">
                    {HOW_IT_WORKS.map((item, i) => (
                      <AccordionItem key={item.question} value={`item-${i}`}>
                        <AccordionTrigger>{item.question}</AccordionTrigger>
                        <AccordionContent>
                          <p className="text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                  <Alert variant="warning">
                    <Info />
                    <AlertTitle>Risk note</AlertTitle>
                    <AlertDescription>
                      <span className="leading-relaxed">{product.riskNote}</span>
                      <span className="mt-1 block text-xs">
                        Projections are estimates, not a promise of returns.
                      </span>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>

            <div className="lg:sticky lg:top-6 lg:self-start">
              <Card>
                <CardContent className="space-y-4 p-6">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider">Commit to this plan</h3>
                  <CapacityProgress product={product} />
                  <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Entry amount</span>
                      <span className="numeric font-semibold">{formatKES(product.minEntry, { decimals: 0 })}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Projected payout*</span>
                      <span className="numeric font-bold text-success">
                        {formatKES(product.minEntry * product.totalPayoutMultiplier)}
                      </span>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={product.status !== "active"}
                    onClick={() => setOpen(true)}
                  >
                    {product.status === "sold_out"
                      ? "Sold out"
                      : product.status === "paused"
                        ? "Paused"
                        : "Invest now"}
                  </Button>
                  <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                    <Lock className="size-3" />
                    Funds move from your Deposit Wallet after you confirm the commitment.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {open && (
            <InvestDialog
              product={product}
              open={open}
              onOpenChange={setOpen}
            />
          )}
        </>
      )}
    </div>
  );
}

function InvestDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { data: wallets } = useApiQuery(["wallets"], getWallets);

  const [amount, setAmount] = React.useState(String(product.minEntry));
  const [wallet, setWallet] = React.useState<WalletType>("deposit");
  const [pin, setPin] = React.useState("");
  const [agreed, setAgreed] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [pending, setPending] = React.useState(false);
  const [success, setSuccess] = React.useState<{
    reference: string;
    amount: number;
    startDate: string;
    maturityDate: string;
    name: string;
  } | null>(null);

  const depositWallet = wallets?.balances.find((b) => b.wallet === "deposit");
  const parsed = Number(amount.replace(/,/g, ""));
  const daily = Number((parsed * product.dailyRate) / 100);
  const projectedPayout = parsed + daily * product.durationDays;

  const resetForm = () => {
    setAmount(String(product.minEntry));
    setWallet("deposit");
    setPin("");
    setAgreed(false);
    setFieldErrors({});
    setPending(false);
    setSuccess(null);
  };

  const close = (openValue: boolean) => {
    onOpenChange(openValue);
    if (!openValue) resetForm();
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!Number.isFinite(parsed) || parsed <= 0) {
      errors.amount = "Enter an amount to invest.";
    } else if (parsed < product.minEntry) {
      errors.amount = `Minimum entry is ${formatKES(product.minEntry, { decimals: 0 })}.`;
    } else if (parsed > product.maxEntry) {
      errors.amount = `Maximum entry is ${formatKES(product.maxEntry, { decimals: 0 })}.`;
    } else if (Math.abs((parsed - product.minEntry) % product.stepAmount) > 0.001) {
      errors.amount = `Amount must be in steps of ${formatKES(product.stepAmount, { decimals: 0 })}.`;
    }
    if (depositWallet && parsed > depositWallet.balance) {
      errors.amount = "Your Deposit Wallet balance is not enough. Add funds first.";
    }
    if (!agreed) errors.agreement = "Please confirm that you understand the projected amounts are estimates.";
    if (pin.length !== 4) errors.pin = "Enter your 4-digit transaction PIN.";
    else if (pin !== DEMO_TRANSACTION_PIN) errors.pin = "Incorrect transaction PIN.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setPending(true);
    const res = await createInvestment({
      productId: product.id,
      amount: parsed,
      wallet: "deposit",
    });
    if (!res.ok) {
      toast.error(res.message);
      setFieldErrors((prev) => ({ ...prev, ...(res.fieldErrors ?? {}) }));
      setPending(false);
      return;
    }
    setSuccess({
      reference: res.data.reference,
      amount: parsed,
      startDate: res.data.investment.startDate,
      maturityDate: res.data.investment.maturityDate,
      name: product.name,
    });
    toast.success("Investment created");
    setPending(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {success ? (
          <>
            <DialogHeader>
              <DialogTitle>Investment created</DialogTitle>
              <DialogDescription>
                Your commitment has been placed and funds moved to your Investment Wallet.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-success-soft text-success">
                <CheckCircle2 className="size-7" />
              </span>
              <p className="text-base font-extrabold">{success.name}</p>
            </div>
            <dl className="space-y-2.5 rounded-lg border border-border bg-muted/40 p-4 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Reference</dt>
                <dd className="numeric font-semibold">{success.reference}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Amount</dt>
                <dd className="numeric font-extrabold">{formatKES(success.amount, { decimals: 0 })}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Start date</dt>
                <dd className="font-semibold">{formatDateTime(success.startDate)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Maturity</dt>
                <dd className="font-semibold">{formatDateTime(success.maturityDate)}</dd>
              </div>
            </dl>
            <DialogFooter className="sm:justify-center">
              <Button onClick={() => router.push("/investments")}>View investments</Button>
              <Button variant="outline" onClick={() => router.push("/dashboard/products")}>
                Browse more
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Invest in {product.name}</DialogTitle>
              <DialogDescription>
                Confirm your entry amount and verify with your transaction PIN to place the commitment.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
              <CurrencyInput
                id="invest-amount"
                label="Entry amount"
                value={amount}
                onChange={(v) => {
                  setAmount(v);
                  setFieldErrors((prev) => ({ ...prev, amount: "" }));
                }}
                error={fieldErrors.amount}
              />
              <div className="space-y-2">
                <Label htmlFor="invest-wallet">Funds from</Label>
                <Select value={wallet} onValueChange={(v) => setWallet(v as WalletType)}>
                  <SelectTrigger id="invest-wallet" className="w-full" aria-label="Choose funding wallet">
                    <SelectValue placeholder="Wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {(wallets?.balances ?? [])
                      .filter((b) => !b.locked)
                      .map((b) => (
                        <SelectItem key={b.wallet} value={b.wallet} disabled={b.wallet !== "deposit"}>
                          <span className="flex items-center justify-between gap-4">
                            <span>{WALLET_META[b.wallet].label}</span>
                            <span className="numeric text-muted-foreground">{formatKES(b.balance)}</span>
                          </span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {depositWallet && (
                  <p className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5" />
                      Investments are funded from your Deposit Wallet.
                    </span>
                    <span className="numeric">
                      Available{" "}
<span className="font-bold text-foreground">
                          {formatKES(depositWallet.balance)}
                        </span>
                    </span>
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="invest-agree"
                    checked={agreed}
                    onCheckedChange={(checked) => {
                      setAgreed(checked === true);
                      setFieldErrors((prev) => ({ ...prev, agreement: "" }));
                    }}
                    aria-invalid={!!fieldErrors.agreement}
                  />
                  <Label htmlFor="invest-agree" className="text-xs leading-relaxed text-muted-foreground">
                    I understand these figures are projections, not a guarantee of returns. Actual
                    results may differ.
                  </Label>
                </div>
                <FieldError message={fieldErrors.agreement} />
              </div>

              <div className="space-y-3 rounded-lg border border-border p-4">
                <TransactionPinInput
                  value={pin}
                  onChange={(v) => {
                    setPin(v);
                    setFieldErrors((prev) => ({ ...prev, pin: "" }));
                  }}
                  error={fieldErrors.pin}
                  disabled={pending}
                />
                <p className="text-center text-[11px] text-muted-foreground">
                  Temporary PIN: <span className="numeric font-bold">{DEMO_TRANSACTION_PIN}</span>. Set a personal PIN in Security.
                </p>
              </div>

              <FeeBreakdown
                rows={[
                  { label: "Entry amount", value: formatKES(parsed) },
                  { label: `Daily earning (${formatPercent(product.dailyRate, 1)} rate)`, value: formatKES(daily) },
                  { label: "Duration", value: `${product.durationDays} days` },
                  { label: "Platform fee", value: formatKES(0) },
                ]}
                totalLabel="Projected payout*"
                totalValue={formatKES(projectedPayout)}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={pending}>
                  Cancel
                </Button>
              </DialogClose>
              <Button onClick={submit} disabled={pending}>
                {pending ? "Placing commitment…" : "Confirm investment"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeftRight, Info, Loader2, Zap } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { CurrencyInput } from "@/components/forms/form-inputs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApiQuery } from "@/hooks/use-api";
import { getWallets, transferBetweenWallets } from "@/lib/services/wallet";
import { WALLET_META } from "@/lib/constants";
import type { WalletType } from "@/lib/types";
import { formatCompactKES, formatKES } from "@/lib/utils";
import { toast } from "sonner";

const MIN_TRANSFER = 100;

export default function WalletTransferPage() {
  const {
    data: wallets,
    isLoading,
    error,
    refetch,
  } = useApiQuery(["wallet"], getWallets);

  const [from, setFrom] = React.useState<WalletType>("deposit");
  const [to, setTo] = React.useState<WalletType>("earnings");
  const [amount, setAmount] = React.useState("");
  const [note, setNote] = React.useState("");
  const [amountError, setAmountError] = React.useState<string>();
  const [submitting, setSubmitting] = React.useState(false);

  const balances = wallets?.balances ?? [];
  const fromBalance = balances.find((b) => b.wallet === from);
  const toBalance = balances.find((b) => b.wallet === to);
  const amountNum = Number(amount);

  const validate = (): string | undefined => {
    if (!amount || amountNum <= 0) return "Enter an amount to transfer.";
    if (amountNum < MIN_TRANSFER)
      return `The minimum transfer is KES ${MIN_TRANSFER.toLocaleString()}.`;
    if (from === to) return "Choose two different wallets.";
    if (fromBalance && amountNum > fromBalance.balance) return "Insufficient balance in the source wallet.";
    if (fromBalance?.locked) return `${fromBalance.label} funds are not available for transfer.`;
    return undefined;
  };

  const handleSwap = () => {
    setFrom(to);
    setTo(from);
    setAmountError(undefined);
  };

  const handleSubmit = async () => {
    const error = validate();
    setAmountError(error);
    if (error) return;
    setSubmitting(true);
    const res = await transferBetweenWallets({ from, to, amount: amountNum });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.message);
      if (res.fieldErrors?.amount) setAmountError(res.fieldErrors.amount);
      return;
    }
    toast.success(
      `Moved ${formatKES(amountNum)} from ${WALLET_META[from].label} to ${WALLET_META[to].label}`
    );
    setAmount("");
    setNote("");
    setAmountError(undefined);
    void refetch();
  };

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Transfer" breadcrumbs={[{ label: "Wallet", href: "/wallet" }, { label: "Transfer" }]} />
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-danger">{error.message}</p>
            <Button className="mt-4" variant="outline" onClick={() => void refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transfer"
        description="Move funds instantly between your own wallets — no fees, instant settlement."
        breadcrumbs={[{ label: "Wallet", href: "/wallet" }, { label: "Transfer" }]}
        actions={
          <Button variant="outline" asChild>
            <Link href="/wallet">Back to wallet</Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Move money</CardTitle>
              <CardDescription>
                Choose the source and destination wallets, then enter the amount.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
                <div className="space-y-2">
                  <Label>From</Label>
                  <Select value={from} onValueChange={(v) => setFrom(v as WalletType)}>
                    <SelectTrigger className="w-full" aria-label="Source wallet">
                      <SelectValue placeholder="Source wallet" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoading && <SelectItem value="loading" disabled>Loading…</SelectItem>}
                      {balances.map((b) => (
                        <SelectItem key={b.wallet} value={b.wallet}>
                          {b.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Available:{" "}
                    <span className="numeric font-bold text-foreground">
                      {fromBalance ? formatKES(fromBalance.balance) : "—"}
                    </span>
                  </p>
                </div>

                <div className="flex justify-center sm:pb-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={handleSwap}
                    aria-label="Swap source and destination wallets"
                  >
                    <ArrowLeftRight />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>To</Label>
                  <Select value={to} onValueChange={(v) => setTo(v as WalletType)}>
                    <SelectTrigger className="w-full" aria-label="Destination wallet">
                      <SelectValue placeholder="Destination wallet" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoading && <SelectItem value="loading" disabled>Loading…</SelectItem>}
                      {balances.map((b) => (
                        <SelectItem key={b.wallet} value={b.wallet}>
                          {b.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Balance:{" "}
                    <span className="numeric font-bold text-foreground">
                      {toBalance ? formatKES(toBalance.balance) : "—"}
                    </span>
                  </p>
                </div>
              </div>

              <CurrencyInput
                id="transfer-amount"
                label="Amount"
                value={amount}
                onChange={(v) => {
                  setAmount(v);
                  setAmountError(undefined);
                }}
                error={amountError}
                hint={`Minimum KES ${MIN_TRANSFER.toLocaleString()} · No transfer fee`}
              />

              <div className="space-y-2">
                <Label htmlFor="transfer-note">Note (optional)</Label>
                <Textarea
                  id="transfer-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Move earnings to deposit for a new plan"
                  maxLength={140}
                  rows={3}
                />
                <p className="text-right text-xs text-muted-foreground">{note.length}/140</p>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
                <div className="min-w-0">
                  <p className="font-bold">Preview</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {from === to
                      ? "Pick two different wallets"
                      : `${WALLET_META[from].shortLabel} → ${WALLET_META[to].shortLabel}`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="numeric text-base font-extrabold">
                    {amountNum > 0 ? formatKES(amountNum) : formatKES(0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Fee {formatKES(0)}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <DemoDataBadge label="No transfer fee" />
                  <span>Transfers between your wallets are recorded immediately after confirmation.</span>
                </div>
                <Button onClick={() => void handleSubmit()} disabled={submitting || isLoading}>
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Transferring…
                    </>
                  ) : (
                    <>
                      <Zap />
                      Transfer now
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Wallet balances</CardTitle>
              <CardDescription>Updates as you transfer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-9 w-full animate-pulse-soft rounded-md bg-muted" />
                  ))
                : balances.map((b) => (
                    <div
                      key={b.wallet}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{b.label}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {b.locked ? "Locked" : WALLET_META[b.wallet].shortLabel}
                        </p>
                      </div>
                      <span className="numeric shrink-0 text-sm font-extrabold">
                        {formatCompactKES(b.balance)}
                      </span>
                    </div>
                  ))}
            </CardContent>
          </Card>

          <Alert variant="info">
            <Info />
            <AlertTitle>Good to know</AlertTitle>
            <AlertDescription>
              Transfers between your own wallets are free and instant. Locked wallets such as the
              Investment Wallet cannot send funds.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}

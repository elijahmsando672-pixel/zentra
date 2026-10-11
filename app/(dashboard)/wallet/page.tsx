"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  History,
  Lock,
  Pencil,
  Plus,
  Smartphone,
  Star,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { MoneyDisplay } from "@/components/shared/money-display";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import { TransactionRow } from "@/components/financial/financial";
import { WalletDonut, WalletLegend, type DonutSlice } from "@/components/charts/wallet-donut";
import { PhoneInput } from "@/components/forms/form-inputs";
import { useApiQuery } from "@/hooks/use-api";
import {
  addPayoutAccount,
  getPayoutAccounts,
  getWallets,
  removePayoutAccount,
  renamePayoutAccount,
  setPrimaryPayoutAccount,
} from "@/lib/services/wallet";
import { getTransactions } from "@/lib/services/records";
import { WALLET_META } from "@/lib/constants";
import type { PayoutAccount } from "@/lib/types";
import { cn, formatCompactKES, formatKES, maskPhone, normalizePhoneKE, relativeTime } from "@/lib/utils";
import { toast } from "sonner";

const QUICK_ACTIONS = [
  {
    label: "Deposit",
    description: "Fund your wallet using available payment methods",
    href: "/wallet/deposit",
    icon: ArrowDownLeft,
  },
  {
    label: "Withdraw",
    description: "Send funds to your M-Pesa number",
    href: "/wallet/withdraw",
    icon: ArrowUpRight,
  },
  {
    label: "Transfer",
    description: "Move money between wallets",
    href: "/wallet/transfer",
    icon: ArrowLeftRight,
  },
  {
    label: "History",
    description: "Deposits and withdrawals log",
    href: "/wallet/history",
    icon: History,
  },
];

export default function WalletPage() {
  const {
    data: wallets,
    isLoading: walletsLoading,
    error: walletsError,
    refetch: refetchWallets,
  } = useApiQuery(["wallet"], getWallets);

  const { data: payoutAccounts, isLoading: payoutsLoading, error: payoutsError } = useApiQuery(
    ["payout-accounts"],
    getPayoutAccounts
  );

  const { data: txPage, isLoading: txLoading } = useApiQuery(["wallet", "recent"], () =>
    getTransactions({ pageSize: 100 })
  );

  const txItems = React.useMemo(() => txPage?.items ?? [], [txPage?.items]);

  const todayFlow = React.useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    let incoming = 0;
    let outgoing = 0;
    for (const t of txItems) {
      if (new Date(t.createdAt) < start) continue;
      if (t.direction === "incoming") incoming += t.netAmount;
      else outgoing += t.netAmount;
    }
    return { incoming, outgoing };
  }, [txItems]);

  const monthFlowByWallet = React.useMemo(() => {
    const now = new Date();
    const map: Record<string, { incoming: number; outgoing: number }> = {};
    for (const t of txItems) {
      const d = new Date(t.createdAt);
      if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) continue;
      const entry = (map[t.wallet] ??= { incoming: 0, outgoing: 0 });
      if (t.direction === "incoming") entry.incoming += t.netAmount;
      else entry.outgoing += t.netAmount;
    }
    return map;
  }, [txItems]);

  const slices: DonutSlice[] = React.useMemo(
    () =>
      (wallets?.balances ?? [])
        .filter((b) => b.balance > 0)
        .map((b) => ({
          label: WALLET_META[b.wallet].shortLabel,
          value: b.balance,
          color: WALLET_META[b.wallet].hue,
        })),
    [wallets]
  );
  const allocatedTotal = slices.reduce((sum, s) => sum + s.value, 0);

  const [addOpen, setAddOpen] = React.useState(false);
  const [nickname, setNickname] = React.useState("");
  const [addPhone, setAddPhone] = React.useState("");
  const [addError, setAddError] = React.useState<{ nickname?: string; phone?: string }>({});
  const [saving, setSaving] = React.useState(false);
  const [renameTarget, setRenameTarget] = React.useState<PayoutAccount | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const [removeTarget, setRemoveTarget] = React.useState<PayoutAccount | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const handleAddAccount = async () => {
    const errors: { nickname?: string; phone?: string } = {};
    if (!nickname.trim()) errors.nickname = "Give this account a nickname.";
    const normalized = normalizePhoneKE(addPhone);
    if (!/^254(7|1)\d{8}$/.test(normalized)) errors.phone = "Use a format like 0712 345 678.";
    setAddError(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    const res = await addPayoutAccount({ nickname: nickname.trim(), phone: normalized });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.message);
      if (res.fieldErrors) setAddError(res.fieldErrors);
      return;
    }
    toast.success("Payout account saved");
    setAddOpen(false);
    setNickname("");
    setAddPhone("");
    setAddError({});
  };

  const handleSetPrimary = async (id: string) => {
    setBusyId(id);
    const res = await setPrimaryPayoutAccount(id);
    setBusyId(null);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success("Primary payout account updated");
  };

  const handleRename = async () => {
    if (!renameTarget) return;
    if (!renameValue.trim()) {
      toast.error("Nickname cannot be empty.");
      return;
    }
    setBusyId(renameTarget.id);
    const res = await renamePayoutAccount(renameTarget.id, renameValue.trim());
    setBusyId(null);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success("Payout account renamed");
    setRenameTarget(null);
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    const res = await removePayoutAccount(removeTarget.id);
    if (!res.ok) {
      toast.error(res.message);
      return false;
    }
    toast.success("Payout account removed");
    return true;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wallet"
        description="Track balances across every wallet, manage M-Pesa payout accounts, and move money in a few taps."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/wallet/withdraw">
                <ArrowUpRight />
                Withdraw
              </Link>
            </Button>
            <Button asChild>
              <Link href="/wallet/deposit">
                <Plus />
                Add funds
              </Link>
            </Button>
          </>
        }
      />

      {walletsError ? (
        <ErrorState
          title="Wallets unavailable"
          description={walletsError.message}
          onRetry={() => void refetchWallets()}
        />
      ) : (
        <>
          <section className="gradient-navy relative overflow-hidden rounded-xl p-6 text-white sm:p-8">
            <div className="grid-pattern absolute inset-0 opacity-40" aria-hidden />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <p className="text-xs font-bold tracking-widest text-white/60 uppercase">
                  Total balance
                </p>
                {walletsLoading || !wallets ? (
                  <Skeleton className="h-12 w-56 bg-white/10" />
                ) : (
                  <MoneyDisplay amount={wallets.totalBalance} size="hero" hideable className="text-white" />
                )}
                {wallets && (
                  <p className="text-sm text-white/70">
                    {wallets.balances.length} wallets · Updated {relativeTime(wallets.updatedAt)}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="rounded-lg border border-white/15 bg-white/5 px-4 py-3">
                  <p className="text-[11px] font-bold tracking-wider text-white/60 uppercase">
                    Available now
                  </p>
                  <p className="numeric mt-1 text-sm font-extrabold">
                    {wallets ? formatKES(wallets.totalAvailable) : "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-white/15 bg-white/5 px-4 py-3">
                  <p className="text-[11px] font-bold tracking-wider text-white/60 uppercase">
                    In today
                  </p>
                  <p className="numeric mt-1 text-sm font-extrabold text-white">
                    +{formatKES(todayFlow.incoming)}
                  </p>
                </div>
                <div className="rounded-lg border border-white/15 bg-white/5 px-4 py-3">
                  <p className="text-[11px] font-bold tracking-wider text-white/60 uppercase">
                    Out today
                  </p>
                  <p className="numeric mt-1 text-sm font-extrabold text-white">
                    −{formatKES(todayFlow.outgoing)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold tracking-tight">Your wallets</h2>
              <span className="text-xs text-muted-foreground">In / out this month</span>
            </div>
            {walletsLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <CardSkeleton key={i} lines={3} />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {(wallets?.balances ?? []).map((b) => {
                  const flow = monthFlowByWallet[b.wallet] ?? { incoming: 0, outgoing: 0 };
                  return (
                    <Card
                      key={b.wallet}
                      className={cn("transition-all hover:shadow-md", b.locked && "opacity-75")}
                    >
                      <CardContent className="space-y-4 p-5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 space-y-1">
                            <p className="truncate text-sm font-extrabold">{b.label}</p>
                            <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                              {WALLET_META[b.wallet].description}
                            </p>
                          </div>
                          {b.locked && (
                            <Badge variant="outline" className="gap-1 text-muted-foreground">
                              <Lock className="size-3" />
                              Locked
                            </Badge>
                          )}
                        </div>
                        <MoneyDisplay amount={b.balance} size="lg" hideable />
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                          <span className="numeric font-bold text-success">
                            In {formatKES(flow.incoming, { decimals: 0 })}
                          </span>
                          <span className="numeric font-bold text-danger">
                            Out {formatKES(flow.outgoing, { decimals: 0 })}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                          <Button size="sm" variant="outline" asChild>
                            <Link href="/wallet/deposit">Deposit</Link>
                          </Button>
                          {!b.locked && (
                            <Button size="sm" variant="outline" asChild>
                              <Link href="/wallet/withdraw">Withdraw</Link>
                            </Button>
                          )}
                          <Button size="sm" variant="outline" asChild>
                            <Link href="/wallet/transfer">Transfer</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Allocation</CardTitle>
                <CardDescription>How your total balance is distributed</CardDescription>
              </CardHeader>
              <CardContent>
                {walletsLoading ? (
                  <div className="flex justify-center py-6">
                    <Skeleton className="size-52 rounded-full" />
                  </div>
                ) : slices.some((s) => s.value > 0) ? (
                  <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
                    <WalletDonut
                      data={slices}
                      centerLabel="Total"
                      centerValue={formatCompactKES(allocatedTotal)}
                    />
                    <div className="w-full max-w-xs">
                      <WalletLegend data={slices} total={allocatedTotal} />
                    </div>
                  </div>
                ) : (
                  <EmptyState title="Nothing to allocate yet" description="Add funds to see how your balance is split." />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick actions</CardTitle>
                <CardDescription>Common wallet tasks</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {QUICK_ACTIONS.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3.5 shadow-xs transition-colors hover:border-primary/40"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground">
                      <action.icon className="size-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{action.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {action.description}
                      </span>
                    </span>
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle>Payout accounts</CardTitle>
                  <CardDescription>M-Pesa numbers that receive your withdrawals</CardDescription>
                </div>
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  <Plus />
                  Add account
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {payoutsError ? (
                  <ErrorState title="Payout accounts unavailable" description={payoutsError.message} />
                ) : payoutsLoading ? (
                  Array.from({ length: 2 }).map((_, i) => <CardSkeleton key={i} lines={2} />)
                ) : !payoutAccounts || payoutAccounts.length === 0 ? (
                  <EmptyState
                    title="No payout accounts yet"
                    description="Save an M-Pesa number so withdrawals can be sent there."
                    action={
                      <Button size="sm" onClick={() => setAddOpen(true)}>
                        <Plus /> Add account
                      </Button>
                    }
                  />
                ) : (
                  payoutAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3.5 shadow-xs"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground">
                          <Smartphone className="size-4.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2 text-sm font-bold">
                            <span className="truncate">{account.nickname}</span>
                            {account.isPrimary && <Badge>Primary</Badge>}
                            {account.verified && (
                              <Badge variant="outline" className="text-success border-success/30">
                                Verified
                              </Badge>
                            )}
                          </p>
                          <p className="numeric text-xs text-muted-foreground">
                            {maskPhone(account.phone)} · M-Pesa
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {!account.isPrimary && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === account.id}
                            onClick={() => void handleSetPrimary(account.id)}
                            aria-label={`Set ${account.nickname} as primary payout account`}
                          >
                            <Star className="size-3.5" />
                            Set primary
                          </Button>
                        )}
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Rename ${account.nickname}`}
                          onClick={() => {
                            setRenameTarget(account);
                            setRenameValue(account.nickname);
                          }}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="text-danger"
                          aria-label={`Remove ${account.nickname}`}
                          onClick={() => setRemoveTarget(account)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold tracking-tight">Recent activity</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/records">
                  View all records
                  <ArrowRight />
                </Link>
              </Button>
            </div>
            {txLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <CardSkeleton key={i} lines={2} />
                ))}
              </div>
            ) : txItems.length === 0 ? (
              <EmptyState
                title="No transactions yet"
                description="Your deposits, withdrawals and transfers will show up here."
                action={
                  <Button size="sm" asChild>
                    <Link href="/wallet/deposit">
                      <Plus /> Add funds
                    </Link>
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {txItems.slice(0, 5).map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add payout account</DialogTitle>
            <DialogDescription>
              Save an M-Pesa number that can receive your withdrawals.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payout-nickname">Nickname</Label>
              <Input
                id="payout-nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. My Safaricom"
                aria-invalid={!!addError.nickname}
              />
              {addError.nickname && (
                <p role="alert" className="text-xs font-semibold text-danger">
                  {addError.nickname}
                </p>
              )}
            </div>
            <PhoneInput
              id="payout-phone"
              label="M-Pesa number"
              required
              value={addPhone}
              onChange={(v) => {
                setAddPhone(v);
                setAddError((e) => ({ ...e, phone: undefined }));
              }}
              error={addError.phone}
            />
            <Alert variant="info">
              <Smartphone />
              <AlertTitle>Payout account</AlertTitle>
              <AlertDescription>
                Accounts are simulated. Up to five M-Pesa numbers can be saved per member.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddOpen(false)}
              disabled={saving}
              type="button"
            >
              Cancel
            </Button>
            <Button onClick={() => void handleAddAccount()} disabled={saving} type="button">
              {saving ? "Saving…" : "Save account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!renameTarget}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename payout account</DialogTitle>
            <DialogDescription>Give this M-Pesa number a clearer label.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-nickname">Nickname</Label>
            <Input
              id="rename-nickname"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="e.g. Business line"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button onClick={() => void handleRename()} disabled={busyId === renameTarget?.id}>
              {busyId === renameTarget?.id ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove payout account?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget
                ? `${removeTarget.nickname} (${maskPhone(removeTarget.phone)}) will be removed from your saved payout accounts.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger text-danger-foreground hover:bg-danger/90"
              onClick={(e) => {
                e.preventDefault();
                void handleRemove().then((done) => {
                  if (done) setRemoveTarget(null);
                });
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeftRight, Info, Loader2, Plus, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { MoneyDisplay } from "@/components/shared/money-display";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { SuccessState } from "@/components/shared/states";
import { FeeBreakdown } from "@/components/financial/financial";
import { CurrencyInput, PhoneInput } from "@/components/forms/form-inputs";
import { TransactionPinInput } from "@/components/forms/code-inputs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApiQuery } from "@/hooks/use-api";
import { getWallets, getPayoutAccounts, addPayoutAccount } from "@/lib/services/wallet";
import {
  computeWithdrawalFee,
  createWithdrawal,
  verifyWithdrawalPin,
} from "@/lib/services/withdrawals";
import {
  DEMO_TRANSACTION_PIN,
  MAX_WITHDRAWAL,
  MIN_WITHDRAWAL,
  WALLET_META,
  WITHDRAWAL_FEE_FLAT,
  WITHDRAWAL_FEE_PERCENT,
} from "@/lib/constants";
import type { WalletType, Withdrawal } from "@/lib/types";
import { formatCompactKES, formatDateTime, formatKES, formatPhoneKE, normalizePhoneKE } from "@/lib/utils";
import { toast } from "sonner";

export default function WalletWithdrawPage() {
  const { data: wallets, isLoading: walletsLoading } = useApiQuery(["wallet"], getWallets);
  const { data: accounts, isLoading: accountsLoading } = useApiQuery(
    ["payout-accounts"],
    getPayoutAccounts
  );

  const [amount, setAmount] = React.useState("");
  const [wallet, setWallet] = React.useState<WalletType>("deposit");
  const [accountId, setAccountId] = React.useState("");
  const [amountError, setAmountError] = React.useState<string>();
  const [pinOpen, setPinOpen] = React.useState(false);
  const [pin, setPin] = React.useState("");
  const [pinError, setPinError] = React.useState<string>();
  const [verifying, setVerifying] = React.useState(false);
  const [created, setCreated] = React.useState<{ reference: string; withdrawal: Withdrawal } | null>(
    null
  );

  const [addOpen, setAddOpen] = React.useState(false);
  const [newNickname, setNewNickname] = React.useState("");
  const [newPhone, setNewPhone] = React.useState("");
  const [addError, setAddError] = React.useState<{ nickname?: string; phone?: string }>({});
  const [savingAccount, setSavingAccount] = React.useState(false);

  const spendable = React.useMemo(
    () => (wallets?.balances ?? []).filter((b) => !b.locked),
    [wallets]
  );
  const source = spendable.find((b) => b.wallet === wallet) ?? spendable[0];
  const selectedAccount =
    accounts?.find((a) => a.id === accountId) ?? accounts?.find((a) => a.isPrimary) ?? accounts?.[0];

  const amountNum = Number(amount);
  const fee = amountNum > 0 ? computeWithdrawalFee(amountNum) : 0;
  const net = amountNum > 0 ? Math.max(0, amountNum - fee) : 0;

  const validateAmount = (): string | undefined => {
    if (!amount || amountNum <= 0) return "Enter an amount to withdraw.";
    if (amountNum < MIN_WITHDRAWAL)
      return `The minimum withdrawal is KES ${MIN_WITHDRAWAL.toLocaleString()}.`;
    if (amountNum > MAX_WITHDRAWAL)
      return `The maximum withdrawal is KES ${MAX_WITHDRAWAL.toLocaleString()}.`;
    if (source && amountNum > source.balance) return "Insufficient balance in this wallet.";
    return undefined;
  };

  const handleReview = () => {
    const error = validateAmount();
    setAmountError(error);
    if (error) return;
    if (!selectedAccount) {
      toast.error("Add a payout account before withdrawing.");
      return;
    }
    setPin("");
    setPinError(undefined);
    setPinOpen(true);
  };

  const handleConfirm = async () => {
    if (!selectedAccount) return;
    setVerifying(true);
    const check = await verifyWithdrawalPin(pin);
    if (!check.ok) {
      setVerifying(false);
      setPinError(check.message);
      return;
    }
    const res = await createWithdrawal({
      amount: amountNum,
      wallet: source?.wallet ?? wallet,
      payoutAccountId: selectedAccount.id,
      pin,
    });
    setVerifying(false);
    if (!res.ok) {
      toast.error(res.message);
      setPinOpen(false);
      setAmountError(res.fieldErrors?.amount ?? res.message);
      return;
    }
    setCreated(res.data);
    setPinOpen(false);
    toast.success("Withdrawal request submitted");
  };

  const handleAddAccount = async () => {
    const errors: { nickname?: string; phone?: string } = {};
    if (!newNickname.trim()) errors.nickname = "Give this account a nickname.";
    const normalized = normalizePhoneKE(newPhone);
    if (!/^254(7|1)\d{8}$/.test(normalized)) errors.phone = "Use a format like 0712 345 678.";
    setAddError(errors);
    if (Object.keys(errors).length > 0) return;

    setSavingAccount(true);
    const res = await addPayoutAccount({ nickname: newNickname.trim(), phone: normalized });
    setSavingAccount(false);
    if (!res.ok) {
      toast.error(res.message);
      if (res.fieldErrors) setAddError(res.fieldErrors);
      return;
    }
    toast.success("Payout account saved");
    setAddOpen(false);
    setNewNickname("");
    setNewPhone("");
    setAddError({});
  };

  if (created) {
    const { reference, withdrawal } = created;
    return (
      <div className="space-y-6">
        <PageHeader
          title="Withdrawal requested"
          description="Your request is queued for review. A processing status does not confirm that a payout has reached your account."
          breadcrumbs={[{ label: "Wallet", href: "/wallet" }, { label: "Withdraw" }]}
        />
        <div className="mx-auto w-full max-w-2xl space-y-4">
          <SuccessState
            title="Withdrawal submitted"
            description={`Reference ${reference} — ${formatKES(withdrawal.netAmount)} will be sent to ${formatPhoneKE(withdrawal.payoutAccount.phone)}.`}
            action={
              <Button asChild>
                <Link href="/wallet/history">
                  <ArrowLeftRight />
                  Track in history
                </Link>
              </Button>
            }
            secondaryAction={
              <Button variant="outline" asChild>
                <Link href="/wallet">Back to wallet</Link>
              </Button>
            }
          />
          <Card>
            <CardContent className="space-y-3 p-5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Reference</span>
                <span className="numeric font-semibold">{reference}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Amount</span>
                <span className="numeric font-semibold">{formatKES(withdrawal.amount)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Fee</span>
                <span className="numeric font-semibold">{formatKES(withdrawal.fee)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Net payout</span>
                <span className="numeric font-extrabold">{formatKES(withdrawal.netAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Requested</span>
                <span className="font-semibold">{formatDateTime(withdrawal.createdAt)}</span>
              </div>
            </CardContent>
          </Card>
          <Alert variant="info">
            <Info />
            <AlertTitle>What happens next</AlertTitle>
            <AlertDescription>
              Your request moves through review and processing. Payout is complete only after the
              payment provider confirms it; follow the status in your transaction history.
            </AlertDescription>
          </Alert>
          <div className="flex justify-center">
            <Button variant="ghost" onClick={() => setCreated(null)}>
              Make another withdrawal
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Withdraw"
        description="Send wallet funds to an M-Pesa number with a live fee quote."
        breadcrumbs={[{ label: "Wallet", href: "/wallet" }, { label: "Withdraw" }]}
        actions={
          <Button variant="outline" asChild>
            <Link href="/wallet">Back to wallet</Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Withdrawal details</CardTitle>
              <CardDescription>
                Minimum KES {MIN_WITHDRAWAL.toLocaleString()} · Maximum KES{" "}
                {MAX_WITHDRAWAL.toLocaleString()} per request
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <CurrencyInput
                id="withdraw-amount"
                label="Amount"
                value={amount}
                onChange={(v) => {
                  setAmount(v);
                  setAmountError(undefined);
                }}
                error={amountError}
                hint={
                  source
                    ? `Available in ${source.label}: ${formatKES(source.balance)}`
                    : undefined
                }
              />

              <div className="space-y-2">
                <Label>From wallet</Label>
                <Select value={source?.wallet ?? wallet} onValueChange={(v) => setWallet(v as WalletType)}>
                  <SelectTrigger className="w-full" aria-label="Select wallet">
                    <SelectValue placeholder="Select a wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {walletsLoading && <SelectItem value="loading" disabled>Loading wallets…</SelectItem>}
                    {spendable.map((b) => (
                      <SelectItem key={b.wallet} value={b.wallet}>
                        {b.label} · {formatCompactKES(b.balance)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Payout account</Label>
                  <Button size="sm" variant="ghost" onClick={() => setAddOpen(true)}>
                    <Plus />
                    Add new
                  </Button>
                </div>
                <Select
                  value={selectedAccount?.id ?? ""}
                  onValueChange={setAccountId}
                  disabled={accountsLoading}
                >
                  <SelectTrigger className="w-full" aria-label="Select payout account">
                    <SelectValue placeholder="Select an M-Pesa account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts?.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nickname} · {formatPhoneKE(a.phone)}
                        {a.isPrimary ? " (primary)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!accountsLoading && (!accounts || accounts.length === 0) && (
                  <p className="text-xs font-semibold text-danger">
                    No payout accounts yet. Add an M-Pesa number to continue.
                  </p>
                )}
              </div>

              <FeeBreakdown
                rows={[
                  { label: "Gross amount", value: amountNum > 0 ? formatKES(amountNum) : formatKES(0) },
                  {
                    label: `Fee (${WITHDRAWAL_FEE_PERCENT}% + KES ${WITHDRAWAL_FEE_FLAT} flat)`,
                    value: formatKES(fee),
                    hint: "Applied to every withdrawal",
                  },
                ]}
                totalLabel="Net payout"
                totalValue={formatKES(net)}
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <DemoDataBadge label="Fee details" />
                  <span>Fee quote is calculated live as you type.</span>
                </div>
                <Button
                  onClick={handleReview}
                  disabled={walletsLoading || accountsLoading || !amount}
                >
                  <ShieldCheck />
                  Review withdrawal
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Balance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {source ? (
                <>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {source.label}
                  </p>
                  <MoneyDisplay amount={source.balance} size="xl" hideable />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {WALLET_META[source.wallet].description}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Loading wallet…</p>
              )}
            </CardContent>
          </Card>
          <Alert variant="warning">
            <Info />
            <AlertTitle>Processing timeline</AlertTitle>
            <AlertDescription>
              This workflow advances requests from pending approval through processing to paid automatically. Confirm the payout with your provider before treating funds as received. Cancel while a request is still awaiting approval.
            </AlertDescription>
          </Alert>
        </div>
      </div>

      <Dialog open={pinOpen} onOpenChange={setPinOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm withdrawal</DialogTitle>
            <DialogDescription>
              Enter your 4-digit transaction PIN to authorize this request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <dl className="space-y-2.5 rounded-lg border border-border bg-muted/40 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Amount</dt>
                <dd className="numeric font-extrabold">{formatKES(amountNum)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Fee</dt>
                <dd className="numeric font-semibold">{formatKES(fee)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border pt-2.5">
                <dt className="font-bold">Net payout</dt>
                <dd className="numeric font-extrabold">{formatKES(net)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">To</dt>
                <dd className="numeric font-semibold">
                  {selectedAccount ? `${selectedAccount.nickname} · ${formatPhoneKE(selectedAccount.phone)}` : "—"}
                </dd>
              </div>
            </dl>
            <TransactionPinInput
              value={pin}
              onChange={(v) => {
                setPin(v);
                setPinError(undefined);
              }}
              error={pinError}
              disabled={verifying}
            />
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <DemoDataBadge label="Transaction PIN" />
              <span>
                Use the temporary PIN <span className="numeric font-bold">{DEMO_TRANSACTION_PIN}</span> until you set a personal PIN.
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPinOpen(false)} disabled={verifying}>
              Cancel
            </Button>
            <Button onClick={() => void handleConfirm()} disabled={pin.length < 4 || verifying}>
              {verifying ? (
                <>
                  <Loader2 className="animate-spin" />
                  Confirming…
                </>
              ) : (
                "Confirm withdrawal"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add payout account</DialogTitle>
            <DialogDescription>Save an M-Pesa number for future withdrawals.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-payout-nickname">Nickname</Label>
              <Input
                id="new-payout-nickname"
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
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
              id="new-payout-phone"
              label="M-Pesa number"
              required
              value={newPhone}
              onChange={(v) => {
                setNewPhone(v);
                setAddError((e) => ({ ...e, phone: undefined }));
              }}
              error={addError.phone}
            />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <DemoDataBadge />
              Payout account details are saved to your account profile.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={savingAccount}>
              Cancel
            </Button>
            <Button onClick={() => void handleAddAccount()} disabled={savingAccount}>
              {savingAccount ? "Saving…" : "Save account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

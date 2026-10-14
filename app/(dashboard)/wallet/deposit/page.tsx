"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  Clock,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StepIndicator } from "@/components/shared/steps";
import { ReceiptPreview } from "@/components/financial/financial";
import { MpesaQrPanel } from "@/components/financial/mpesa-qr-panel";
import { EmptyState, ErrorState, SuccessState } from "@/components/shared/states";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { CopyButton } from "@/components/shared/copy-button";
import { CurrencyInput, PhoneInput } from "@/components/forms/form-inputs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useApiQuery } from "@/hooks/use-api";
import {
  capturePaypalDeposit,
  cancelDeposit,
  getCheckoutConfig,
  getDepositStatus,
  initiateDeposit,
} from "@/lib/services/deposits";
import {
  ADMIN_EMAIL,
  ADMIN_NAME,
  MAX_DEPOSIT,
  MIN_DEPOSIT,
  DEFAULT_MPESA_TILL_NUMBER,
  DEFAULT_WHATSAPP_NUMBER,
  PAYMENT_METHOD_META,
} from "@/lib/constants";
import type { Deposit, PaymentMethod } from "@/lib/types";
import { cn, formatDateTime, formatKES, formatPhoneKE, normalizePhoneKE } from "@/lib/utils";
import { toast } from "sonner";

const QUICK_AMOUNTS = [500, 1000, 5000];

export default function WalletDepositPage() {
  const checkout = useApiQuery(["checkout", "config"], getCheckoutConfig);
  const contact = checkout.data?.contact ?? {
    adminName: ADMIN_NAME,
    adminEmail: ADMIN_EMAIL,
    whatsappNumber: DEFAULT_WHATSAPP_NUMBER,
    mpesaTillNumber: DEFAULT_MPESA_TILL_NUMBER,
  };
  const enabledMethods = React.useMemo(
    () => checkout.data?.enabledMethods ?? (["paypal"] as PaymentMethod[]),
    [checkout.data?.enabledMethods]
  );

  const [method, setMethod] = React.useState<PaymentMethod>("paypal");
  const [step, setStep] = React.useState(0);
  const [stage, setStage] = React.useState<"form" | "processing" | "success" | "failed" | "cancelled">(
    "form"
  );
  const [amount, setAmount] = React.useState("");
  const [phone, setPhone] = React.useState("0712 345 678");
  const [reference, setReference] = React.useState("");
  const [amountError, setAmountError] = React.useState<string>();
  const [phoneError, setPhoneError] = React.useState<string>();
  const [referenceError, setReferenceError] = React.useState<string>();
  const [submitting, setSubmitting] = React.useState(false);
  const [deposit, setDeposit] = React.useState<Deposit | null>(null);
  const [demoNote, setDemoNote] = React.useState("");
  const [cancelling, setCancelling] = React.useState(false);
  const [secondsLeft, setSecondsLeft] = React.useState(60);

  const amountNum = Number(amount);

  React.useEffect(() => {
    if (enabledMethods.length === 0) return;
    if (!enabledMethods.includes(method)) setMethod(enabledMethods[0]);
  }, [enabledMethods, method]);

  const STEPS =
    method === "paypal"
      ? [
          { label: "Amount", description: "How much to add" },
          { label: "PayPal reference", description: "Your payment ID" },
          { label: "Confirm", description: "Review and submit" },
        ]
      : [
          { label: "Amount", description: "How much to add" },
          { label: "M-Pesa number", description: "Where the prompt goes" },
          { label: "Confirm", description: "Review and send" },
        ];

  const {
    data: liveDeposit,
    isLoading: statusLoading,
    error: statusError,
  } = useApiQuery(
    ["deposit-status", deposit?.id ?? ""],
    () => getDepositStatus(deposit!.id),
    { enabled: stage === "processing" && !!deposit && method === "mpesa", refetchInterval: 2500 }
  );

  React.useEffect(() => {
    if (!liveDeposit) return;
    if (liveDeposit.status === "completed") {
      setDeposit(liveDeposit);
      setStage("success");
    } else if (liveDeposit.status === "failed") {
      setDeposit(liveDeposit);
      setStage("failed");
    } else if (liveDeposit.status === "cancelled") {
      setDeposit(liveDeposit);
      setStage("cancelled");
    }
  }, [liveDeposit]);

  /* When returning from a live PayPal checkout, capture server-side. */
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("paypal") !== "success") return;
    const ref = params.get("ref") ?? "";
    const depositId = ref ? window.sessionStorage.getItem(`zentra_paypal_${ref}`) : null;
    window.history.replaceState({}, "", window.location.pathname);
    if (!depositId) return;
    void (async () => {
      const res = await capturePaypalDeposit(depositId);
      if (res.ok) {
        setDeposit(res.data.deposit);
        setStage("success");
      } else {
        toast.error(res.message);
      }
    })();
  }, []);

  React.useEffect(() => {
    if (stage !== "processing" || method !== "mpesa") return;
    setSecondsLeft(60);
    const timer = window.setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [stage, method]);

  const validateAmount = () => {
    if (!amount || amountNum <= 0) {
      setAmountError("Enter an amount to continue.");
      return false;
    }
    if (amountNum < MIN_DEPOSIT) {
      setAmountError(`The minimum deposit is KES ${MIN_DEPOSIT.toLocaleString()}.`);
      return false;
    }
    if (amountNum > MAX_DEPOSIT) {
      setAmountError(`The maximum deposit is KES ${MAX_DEPOSIT.toLocaleString()}.`);
      return false;
    }
    setAmountError(undefined);
    return true;
  };

  const validatePhone = () => {
    const normalized = normalizePhoneKE(phone);
    if (!/^254(7|1)\d{8}$/.test(normalized)) {
      setPhoneError("Enter a valid Kenyan M-Pesa number, e.g. 0712 345 678.");
      return false;
    }
    setPhoneError(undefined);
    return true;
  };

  const validateReference = () => {
    const value = reference.trim();
    if (!value) {
      setReferenceError("Enter the PayPal transaction reference you will send.");
      return false;
    }
    if (!/^[A-Za-z0-9-_]{6,64}$/.test(value)) {
      setReferenceError("Use the reference shown on your PayPal receipt (letters, numbers, dashes).");
      return false;
    }
    setReferenceError(undefined);
    return true;
  };

  const handleInitiate = async () => {
    if (!validateAmount()) return;
    if (method === "mpesa" && !validatePhone()) return;
    if (method === "paypal" && !validateReference()) return;
    setSubmitting(true);
    const res = await initiateDeposit({
      amount: amountNum,
      phone: normalizePhoneKE(phone),
      method,
      providerReference: method === "paypal" ? reference.trim() : undefined,
      wallet: "deposit",
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.message);
      if (res.fieldErrors?.amount) setAmountError(res.fieldErrors.amount);
      if (res.fieldErrors?.phone) setPhoneError(res.fieldErrors.phone);
      if (res.fieldErrors?.providerReference) setReferenceError(res.fieldErrors.providerReference);
      return;
    }
    setDeposit(res.data.deposit);
    setDemoNote(res.data.demoNote ?? res.data.verificationNote ?? "");

    if (method === "paypal") {
      if (res.data.paypal?.approveUrl) {
        window.sessionStorage.setItem(
          `zentra_paypal_${res.data.deposit.reference}`,
          res.data.deposit.id
        );
        window.open(res.data.paypal.approveUrl, "_blank", "noopener");
        setStage("processing");
      } else {
        setStage("success");
      }
      return;
    }
    setStage("processing");
  };

  const handleCancel = async () => {
    if (!deposit) return;
    setCancelling(true);
    const res = await cancelDeposit(deposit.id);
    setCancelling(false);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    setDeposit({ ...deposit, status: "cancelled" });
    setStage("cancelled");
    toast.success("Deposit cancelled");
  };

  const restartForm = (keepAmount = false) => {
    setStage("form");
    setStep(0);
    setDeposit(null);
    setDemoNote("");
    setAmountError(undefined);
    setPhoneError(undefined);
    setReferenceError(undefined);
    setReference("");
    if (!keepAmount) setAmount("");
  };

  const isForm = stage === "form";
  const liveStatus = liveDeposit?.status ?? deposit?.status ?? "pending";
  const canCancel = stage === "processing" && liveStatus === "pending";
  const isPendingVerification = method === "paypal" && stage === "success";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deposit funds"
        description="Add money to your deposit wallet using available payment methods."
        breadcrumbs={[{ label: "Wallet", href: "/wallet" }, { label: "Deposit" }]}
        actions={
          <Button variant="outline" asChild>
            <Link href="/wallet">Back to wallet</Link>
          </Button>
        }
      />

      <Alert variant="info">
        <Smartphone />
        <AlertTitle>How payments settle</AlertTitle>
        <AlertDescription>
          M-Pesa deposits are available only after a Till is configured. When live provider
          credentials are unavailable, an STK prompt may be simulated and will not move real funds.
          PayPal is credited only after verification; submitting a reference alone never credits your wallet.
        </AlertDescription>
      </Alert>

      {isForm && (
        <div className="mx-auto w-full max-w-2xl space-y-6">
          <StepIndicator steps={STEPS} current={step} />

          <Card>
            <CardContent className="space-y-6 p-6">
              {step === 0 && (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <h2 className="text-base font-extrabold tracking-tight">How much do you want to add?</h2>
                    <p className="text-sm text-muted-foreground">
                      Choose how you want to pay, then enter the amount.
                    </p>
                  </div>

                  <div role="radiogroup" aria-label="Payment method" className="grid gap-3 sm:grid-cols-2">
                    {(["mpesa", "paypal"] as PaymentMethod[]).map((m) => {
                      const meta = PAYMENT_METHOD_META[m];
                      const Icon = meta.icon;
                      const disabled = !enabledMethods.includes(m);
                      const active = method === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          disabled={disabled}
                          onClick={() => {
                            setMethod(m);
                            setStep(0);
                            setPhoneError(undefined);
                            setReferenceError(undefined);
                          }}
                          className={cn(
                            "flex items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                            active
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/40",
                            disabled && "cursor-not-allowed opacity-50"
                          )}
                        >
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                            <Icon className="size-4" />
                          </span>
                          <span className="min-w-0 space-y-0.5">
                            <span className="flex items-center gap-2 text-sm font-bold">
                              {meta.label}
                              {active && <BadgeCheck className="size-4 text-primary" />}
                            </span>
                            <span className="block text-xs text-muted-foreground leading-relaxed">
                              {meta.description}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {!contact.mpesaTillNumber.trim() && (
                    <Alert variant="warning">
                      <AlertTitle>M-Pesa deposits are not configured</AlertTitle>
                      <AlertDescription>
                        M-Pesa will be available after a Till number is added in the admin settings.
                      </AlertDescription>
                    </Alert>
                  )}

                  <CurrencyInput
                    id="deposit-amount"
                    label="Amount"
                    value={amount}
                    onChange={(v) => {
                      setAmount(v);
                      setAmountError(undefined);
                    }}
                    error={amountError}
                    hint={`Minimum KES ${MIN_DEPOSIT.toLocaleString()} · Maximum KES ${MAX_DEPOSIT.toLocaleString()}`}
                  />
                  <div className="flex flex-wrap gap-2">
                    {QUICK_AMOUNTS.map((quick) => (
                      <Button
                        key={quick}
                        type="button"
                        size="sm"
                        variant={amount === String(quick) ? "default" : "outline"}
                        onClick={() => {
                          setAmount(String(quick));
                          setAmountError(undefined);
                        }}
                      >
                        KES {quick.toLocaleString()}
                      </Button>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => {
                        if (validateAmount()) setStep(1);
                      }}
                    >
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {step === 1 && method === "mpesa" && (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <h2 className="text-base font-extrabold tracking-tight">M-Pesa number</h2>
                    <p className="text-sm text-muted-foreground">
                      An STK push prompt will be sent to this number for you to enter your M-Pesa
                      PIN.
                    </p>
                  </div>
                  <PhoneInput
                    id="deposit-phone"
                    label="Phone number"
                    required
                    value={phone}
                    onChange={(v) => {
                      setPhone(v);
                      setPhoneError(undefined);
                    }}
                    error={phoneError}
                  />
                  <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      M-Pesa Till
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <span className="font-semibold">
                        {contact.adminName} · <span className="numeric">{contact.mpesaTillNumber}</span>
                      </span>
                      <CopyButton value={contact.mpesaTillNumber} label="Copy Till number" />
                    </div>
                  </div>
                  <MpesaQrPanel
                    amount={amountNum}
                    tillNumber={contact.mpesaTillNumber}
                    merchantName={contact.adminName}
                  />
                  <Alert variant="default">
                    <ShieldCheck />
                    <AlertTitle>How it works</AlertTitle>
                    <AlertDescription>
                      You will see a prompt on your handset showing KES {formatKES(amountNum)}.
                      Approving it completes the deposit.
                    </AlertDescription>
                  </Alert>
                  <div className="flex justify-between gap-2">
                    <Button variant="outline" onClick={() => setStep(0)}>
                      <ArrowLeft />
                      Back
                    </Button>
                    <Button
                      onClick={() => {
                        if (validatePhone()) setStep(2);
                      }}
                    >
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {step === 1 && method === "paypal" && (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <h2 className="text-base font-extrabold tracking-tight">Pay with PayPal</h2>
                    <p className="text-sm text-muted-foreground">
                      Send {formatKES(amountNum)} to our PayPal account, then enter the transaction
                      reference below so it can be matched.
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Send payment to
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <span className="font-semibold break-all">{contact.adminEmail}</span>
                      <CopyButton value={contact.adminEmail} label="Copy PayPal email" />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Recipient: {contact.adminName}. Include reference <span className="font-semibold">NX DEPOSIT</span> if your PayPal app asks for a note.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paypal-reference">PayPal transaction reference</Label>
                    <Input
                      id="paypal-reference"
                      value={reference}
                      onChange={(e) => {
                        setReference(e.target.value);
                        setReferenceError(undefined);
                      }}
                      placeholder="e.g. 7XK92210AB1234567"
                      aria-invalid={!!referenceError}
                      autoComplete="off"
                    />
                    {referenceError && (
                      <p role="alert" className="text-xs font-semibold text-danger">
                        {referenceError}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      This is what we use to find your payment. It is not proof of payment on its
                      own — operations verifies it before your wallet is credited.
                    </p>
                  </div>

                  <div className="flex justify-between gap-2">
                    <Button variant="outline" onClick={() => setStep(0)}>
                      <ArrowLeft />
                      Back
                    </Button>
                    <Button
                      onClick={() => {
                        if (validateReference()) setStep(2);
                      }}
                    >
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <h2 className="text-base font-extrabold tracking-tight">
                      Confirm your {PAYMENT_METHOD_META[method].label} deposit
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Review the details before you continue.
                    </p>
                  </div>
                  <dl className="space-y-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">Amount</dt>
                      <dd className="numeric font-extrabold">{formatKES(amountNum)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">Fee</dt>
                      <dd className="numeric font-semibold">{formatKES(0)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                      <dt className="font-bold">You receive</dt>
                      <dd className="numeric text-base font-extrabold">{formatKES(amountNum)}</dd>
                    </div>
                    {method === "mpesa" ? (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-muted-foreground">M-Pesa number</dt>
                          <dd className="numeric font-semibold">{formatPhoneKE(phone)}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-muted-foreground">Till</dt>
                          <dd className="numeric font-semibold">{contact.mpesaTillNumber}</dd>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-muted-foreground">PayPal account</dt>
                          <dd className="font-semibold break-all text-right">{contact.adminEmail}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-muted-foreground">Reference</dt>
                          <dd className="numeric font-semibold">{reference.trim()}</dd>
                        </div>
                      </>
                    )}
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">Wallet</dt>
                      <dd className="font-semibold">Deposit Wallet</dd>
                    </div>
                  </dl>
                  <div className="flex justify-between gap-2">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      <ArrowLeft />
                      Back
                    </Button>
                    <Button onClick={() => void handleInitiate()} disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="animate-spin" />
                          Submitting…
                        </>
                      ) : method === "paypal" ? (
                        "Submit for verification"
                      ) : (
                        "Send STK prompt"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {stage === "processing" && (
        <div className="mx-auto w-full max-w-2xl">
          <Card>
            <CardContent className="flex flex-col items-center gap-5 p-8 text-center">
              <span className="relative flex size-16 items-center justify-center rounded-full bg-info-soft text-info">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-info/20" aria-hidden />
                <Smartphone className="relative size-7" />
              </span>
              <div className="space-y-2">
                <h2 className="text-lg font-extrabold tracking-tight">
                  {method === "paypal"
                    ? "Complete your payment on PayPal…"
                    : "Check your phone for the M-Pesa prompt…"}
                </h2>
                <p className="mx-auto max-w-md text-sm text-muted-foreground leading-relaxed">
                  {demoNote ||
                    (method === "paypal"
                      ? "Finish the payment in the PayPal window that opened, then return here. This page confirms automatically."
                      : "Approve the simulated prompt on your handset. This page updates automatically.")}
                </p>
              </div>

              <div className="w-full space-y-3 rounded-lg border border-border bg-muted/40 p-4 text-left text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="numeric font-extrabold">{formatKES(amountNum)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Reference</span>
                  <span className="numeric font-semibold">{deposit?.reference ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className="bg-info-soft text-info" variant="outline">
                    {statusLoading ? "Checking…" : liveStatus === "pending" ? "Awaiting payment" : liveStatus}
                  </Badge>
                </div>
                {method === "mpesa" && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Prompt expires in</span>
                    <span className="numeric font-semibold">
                      {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
                    </span>
                  </div>
                )}
              </div>

              {statusError && method === "mpesa" && (
                <p className="text-xs font-semibold text-danger">
                  Lost connection while checking status. Retrying automatically…
                </p>
              )}

              {method === "mpesa" && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => void handleCancel()}
                    disabled={!canCancel || cancelling}
                  >
                    {cancelling ? "Cancelling…" : "Cancel deposit"}
                  </Button>
                  {!canCancel && (
                    <p className="w-full text-xs text-muted-foreground">
                      This request is already being processed and can no longer be cancelled.
                    </p>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <DemoDataBadge label="Payment status" />
                <span>Prompt delivery is simulated when live M-Pesa credentials are unavailable.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {stage === "success" && deposit && isPendingVerification && (
        <div className="mx-auto w-full max-w-2xl space-y-4">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-info-soft text-info">
                <Clock className="size-6" />
              </span>
              <div className="space-y-1.5">
                <h2 className="text-lg font-extrabold tracking-tight">Payment submitted</h2>
                <p className="mx-auto max-w-md text-sm text-muted-foreground leading-relaxed">
                  We recorded your PayPal reference{" "}
                  <span className="numeric font-semibold">{deposit.providerReference}</span> for{" "}
                  {formatKES(deposit.amount)}. Your Deposit Wallet is credited only after operations
                  verifies the payment.
                </p>
              </div>
              <Badge variant="outline" className="bg-info-soft text-info">
                Pending verification
              </Badge>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button asChild>
                  <Link href="/wallet/history">View deposit status</Link>
                </Button>
                <Button variant="outline" onClick={() => restartForm(true)}>
                  <RotateCcw />
                  Make another deposit
                </Button>
              </div>
            </CardContent>
          </Card>
          <ReceiptPreview
            reference={deposit.reference}
            title="PayPal deposit"
            amount={formatKES(deposit.amount)}
            fee={formatKES(deposit.fee)}
            net={formatKES(deposit.amount - deposit.fee)}
            status={
              <Badge className="bg-info-soft text-info" variant="outline">
                <Clock className="size-3" />
                Pending
              </Badge>
            }
            date={formatDateTime(deposit.createdAt)}
            meta={[
              { label: "PayPal account", value: contact.adminEmail },
              { label: "Reference", value: deposit.providerReference ?? "—" },
              { label: "Wallet", value: "Deposit Wallet" },
            ]}
          />
        </div>
      )}

      {stage === "success" && deposit && !isPendingVerification && (
        <div className="mx-auto w-full max-w-2xl space-y-4">
          <SuccessState
            title="Deposit successful"
            description={`${formatKES(deposit.amount)} was added to your Deposit Wallet.`}
            action={
              <Button asChild>
                <Link href="/wallet">View wallet</Link>
              </Button>
            }
            secondaryAction={
              <Button variant="outline" onClick={() => restartForm(false)}>
                <RotateCcw />
                Deposit again
              </Button>
            }
          />
          <ReceiptPreview
            reference={deposit.reference}
            title="M-Pesa deposit"
            amount={formatKES(deposit.amount)}
            fee={formatKES(deposit.fee)}
            net={formatKES(deposit.amount - deposit.fee)}
            status={
              <Badge className="bg-success-soft text-success" variant="outline">
                <Check className="size-3" />
                Paid
              </Badge>
            }
            date={formatDateTime(deposit.completedAt ?? deposit.createdAt)}
            meta={[
              { label: "M-Pesa number", value: formatPhoneKE(deposit.phone) },
              { label: "Wallet", value: "Deposit Wallet" },
            ]}
          />
        </div>
      )}

      {stage === "failed" && deposit && (
        <div className="mx-auto w-full max-w-2xl space-y-4">
          <ErrorState
            title="Deposit failed"
            description={
              deposit.failureReason ||
              "The payment could not be completed. No money left your wallet."
            }
            action={
              <Button onClick={() => restartForm(true)}>
                <RotateCcw />
                Try again
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
                <span className="numeric font-semibold">{deposit.reference}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Amount</span>
                <span className="numeric font-semibold">{formatKES(deposit.amount)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Method</span>
                <span className="font-semibold">{PAYMENT_METHOD_META[deposit.method].label}</span>
              </div>
              <Separator />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Some simulated payments fail on purpose so the error flow can be reviewed. Try a
                different amount when you retry.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {stage === "cancelled" && (
        <div className="mx-auto w-full max-w-2xl">
          <EmptyState
            icon={<XCircle />}
            title="Deposit cancelled"
            description="The request was cancelled before confirmation, so no funds were added to your wallet."
            action={
              <Button onClick={() => restartForm(false)}>
                <RotateCcw />
                Start a new deposit
              </Button>
            }
            secondaryAction={
              <Button variant="outline" asChild>
                <Link href="/wallet">Back to wallet</Link>
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
}

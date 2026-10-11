"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OtpInput } from "@/components/forms/code-inputs";
import { ErrorState, LoadingSkeleton } from "@/components/shared/states";
import { requestOtp, verifyOtp } from "@/lib/services/auth";
import { formatPhoneKE, normalizePhoneKE } from "@/lib/utils";

export default function VerifyOtpPage() {
  const router = useRouter();
  const [ready, setReady] = React.useState(false);
  const [target, setTarget] = React.useState("");
  const [code, setCode] = React.useState("");
  const [demoCode, setDemoCode] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [pending, setPending] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);

  const sendCode = React.useCallback(async (value: string) => {
    setSending(true);
    setError(undefined);
    const res = await requestOtp(value);
    setSending(false);
    if (!res.ok) {
      toast.error(res.message);
      setError(res.message);
      return;
    }
    setDemoCode(res.data.demoCode);
    setCooldown(30);
  }, []);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get("t") ?? "";
    setTarget(value);
    setReady(true);
    if (value) void sendCode(value);
  }, [sendCode]);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setError(undefined);
    setPending(true);
    const res = await verifyOtp(target, code);
    setPending(false);
    if (!res.ok) {
      toast.error(res.message);
      setError(res.fieldErrors?.code ?? res.message);
      return;
    }
    toast.success("Phone number verified");
    router.push("/dashboard");
  };

  if (!ready) {
    return (
      <Card className="animate-fade-up">
        <CardContent className="space-y-3 py-10">
          <LoadingSkeleton className="w-1/2" />
          <LoadingSkeleton />
          <LoadingSkeleton className="w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (!target) {
    return (
      <div className="animate-fade-up">
        <ErrorState
          title="Verification link incomplete"
          description="This page needs a phone number or email to verify. Start again from the login or registration flow."
          action={
            <Button asChild>
              <Link href="/login">Back to login</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const displayTarget = target.includes("@")
    ? target
    : formatPhoneKE(normalizePhoneKE(target));

  return (
    <div className="animate-fade-up">
      <Card>
        <CardHeader className="gap-1.5 pt-6">
          <CardTitle className="text-2xl font-extrabold tracking-tight">
            Verify your phone
          </CardTitle>
          <CardDescription>
            Enter the 6-digit verification code for{" "}
            <span className="font-bold text-foreground">{displayTarget}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="space-y-4">
            {sending ? (
              <div className="rounded-sm border border-dashed border-border bg-muted px-3.5 py-3 text-xs font-semibold text-muted-foreground">
                Sending a new code…
              </div>
            ) : demoCode ? (
              <div className="rounded-sm border border-dashed border-info/40 bg-info-soft/60 px-3.5 py-3 text-xs text-info">
                <span className="font-bold">Your verification code: {demoCode}</span>. Message
                delivery is not configured, so the code is shown here.
              </div>
            ) : null}

            <OtpInput
              value={code}
              onChange={(value) => {
                setCode(value);
                if (error) setError(undefined);
              }}
              error={error}
              disabled={sending || pending}
              label="Verification code"
            />

            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={handleVerify}
              disabled={pending || sending}
            >
              {pending ? "Verifying…" : "Verify & finish"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => void sendCode(target)}
              disabled={sending || cooldown > 0}
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/login"
              className="font-bold text-primary underline-offset-4 hover:underline"
            >
              Back to login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

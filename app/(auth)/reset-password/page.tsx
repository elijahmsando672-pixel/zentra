"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OtpInput } from "@/components/forms/code-inputs";
import { PasswordInput } from "@/components/forms/form-inputs";
import { ErrorState, LoadingSkeleton, SuccessState } from "@/components/shared/states";
import { resetPassword, verifyOtp } from "@/lib/services/auth";
import { formatPhoneKE, maskEmail, normalizePhoneKE } from "@/lib/utils";

export default function ResetPasswordPage() {
  const [ready, setReady] = React.useState(false);
  const [target, setTarget] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [pending, setPending] = React.useState(false);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTarget(params.get("t") ?? "");
    setCode(params.get("c") ?? "");
    setReady(true);
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (password.length < 8) next.password = "Use at least 8 characters.";
    if (password !== confirmPassword) next.confirmPassword = "Passwords do not match.";
    if (code.length !== 6) next.code = "Enter the 6-digit code.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setPending(true);
    const verified = await verifyOtp(target, code);
    if (!verified.ok) {
      setPending(false);
      toast.error(verified.message);
      setErrors({ code: verified.fieldErrors?.code ?? verified.message });
      return;
    }
    const res = await resetPassword(target, password);
    setPending(false);
    if (!res.ok) {
      toast.error(res.message);
      setErrors({ password: res.fieldErrors?.password ?? res.message });
      return;
    }
    toast.success("Password reset successfully");
    setDone(true);
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
          title="Start at Forgot password"
          description="This page needs the phone number or email you are resetting. Request a verification code first and we will bring you right back here."
          action={
            <Button asChild>
              <Link href="/forgot-password">Go to forgot password</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (done) {
    return (
      <div className="animate-fade-up">
        <SuccessState
          title="Password updated"
          description="Your password has been changed and your phone number is verified. You can now log in with your new password."
          action={
            <Button asChild>
              <Link href="/login">Back to login</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const maskedTarget = target.includes("@")
    ? maskEmail(target)
    : formatPhoneKE(normalizePhoneKE(target));

  return (
    <div className="animate-fade-up">
      <Card>
        <CardHeader className="gap-1.5 pt-6">
          <CardTitle className="text-2xl font-extrabold tracking-tight">
            Reset password
          </CardTitle>
          <CardDescription>
            Choose a new password for{" "}
            <span className="font-bold text-foreground">{maskedTarget}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <PasswordInput
              id="reset-password"
              label="New password"
              autoComplete="new-password"
              placeholder="Enter a new password"
              value={password}
              onChange={setPassword}
              error={errors.password}
              showStrength
            />
            <PasswordInput
              id="reset-confirm"
              label="Confirm password"
              autoComplete="new-password"
              placeholder="Re-enter the new password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              error={errors.confirmPassword}
            />
            <div className="space-y-2">
              <OtpInput
                value={code}
                onChange={(value) => {
                  setCode(value);
                  if (errors.code) setErrors({});
                }}
                error={errors.code}
                disabled={pending}
                label="Verification code"
              />
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              {pending ? "Updating password…" : "Reset password"}
            </Button>
          </form>

          <Alert variant="info">
            <AlertDescription>
              Enter a new password and the verification code shown for your account.
            </AlertDescription>
          </Alert>

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

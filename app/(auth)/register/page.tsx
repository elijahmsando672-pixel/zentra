"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/forms/code-inputs";
import {
  FieldError,
  PasswordInput,
  PhoneInput,
  getPasswordStrength,
} from "@/components/forms/form-inputs";
import { StepIndicator } from "@/components/shared/steps";
import { registerUser, requestOtp, verifyOtp } from "@/lib/services/auth";
import { formatPhoneKE, normalizePhoneKE } from "@/lib/utils";

const STEPS = [
  { label: "Personal", title: "Create your account", description: "Tell us the basics about you." },
  { label: "Invite", title: "Invite code", description: "Optional, but it unlocks team rewards." },
  {
    label: "Security",
    title: "Secure your account",
    description: "Choose a password and accept the terms.",
  },
  { label: "Verify", title: "Verify your phone", description: "Enter the 6-digit code we sent you." },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [inviteCode, setInviteCode] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);
  const [otp, setOtp] = React.useState("");
  const [demoCode, setDemoCode] = React.useState<string | null>(null);
  const [otpSending, setOtpSending] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get("inviteCode");
    if (invite) setInviteCode(invite);
  }, []);

  React.useEffect(() => {
    if (step !== 3) return;
    let cancelled = false;
    setOtpSending(true);
    setDemoCode(null);
    setOtp("");
    requestOtp(normalizePhoneKE(phone)).then((res) => {
      if (cancelled) return;
      setOtpSending(false);
      if (res.ok) setDemoCode(res.data.demoCode);
      else toast.error(res.message);
    });
    return () => {
      cancelled = true;
    };
  }, [step, phone]);

  const validateCurrentStep = () => {
    const next: Record<string, string> = {};
    if (step === 0) {
      if (fullName.trim().length < 2) next.fullName = "Enter your full name.";
      const normalizedPhone = normalizePhoneKE(phone);
      if (normalizedPhone.length !== 12 || !normalizedPhone.startsWith("254")) {
        next.phone = "Enter a valid Kenyan phone number.";
      }
      if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email address.";
    }
    if (step === 2) {
      if (getPasswordStrength(password).score < 3) {
        next.password = "Use at least 8 characters with uppercase, lowercase and a number.";
      }
      if (password !== confirmPassword) next.confirmPassword = "Passwords do not match.";
      if (!acceptedTerms) next.terms = "Please accept the terms to continue.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleContinue = async () => {
    if (!validateCurrentStep()) return;
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    setPending(true);
    const res = await registerUser({
      fullName: fullName.trim(),
      phone,
      email: email.trim(),
      password,
      inviteCode: inviteCode.trim() || undefined,
    });
    setPending(false);
    if (!res.ok) {
      toast.error(res.message);
      if (res.code === "duplicate_phone" || res.code === "duplicate_email") {
        const field = res.code === "duplicate_phone" ? "phone" : "email";
        setErrors({ [field]: res.fieldErrors?.[field] ?? res.message });
        setStep(0);
        return;
      }
      setErrors(res.fieldErrors ?? {});
      return;
    }
    setStep(3);
  };

  const handleBack = () => {
    setErrors({});
    setStep((current) => Math.max(current - 1, 0));
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setErrors({ otp: "Enter the 6-digit code." });
      return;
    }
    setErrors({});
    setPending(true);
    const res = await verifyOtp(normalizePhoneKE(phone), otp);
    setPending(false);
    if (!res.ok) {
      toast.error(res.message);
      setErrors({ otp: res.fieldErrors?.code ?? res.message });
      return;
    }
    toast.success("Phone verified. Welcome to Zentra!");
    router.push("/dashboard");
  };

  return (
    <div className="animate-fade-up">
      <Card>
        <CardHeader className="gap-4 pt-6">
          <StepIndicator steps={STEPS.map(({ label }) => ({ label }))} current={step} />
          <div className="space-y-1.5">
            <CardTitle className="text-xl font-extrabold tracking-tight">
              {STEPS[step].title}
            </CardTitle>
            <CardDescription>{STEPS[step].description}</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-5">
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  autoComplete="name"
                  placeholder="Alex Mwangi"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  aria-invalid={!!errors.fullName}
                />
                <FieldError message={errors.fullName} />
              </div>
              <PhoneInput
                label="Phone number"
                required
                value={phone}
                onChange={setPhone}
                error={errors.phone}
              />
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={!!errors.email}
                />
                <FieldError message={errors.email} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <Alert variant="info">
                <AlertTitle>3-level team rewards</AlertTitle>
                <AlertDescription>
                  Your invite code links you to a referrer and unlocks three reward levels: the
                  people you bring in (level 1), the people they bring in (level 2), and the people
                  they bring in (level 3).
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label htmlFor="inviteCode">
                  Invite code{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="inviteCode"
                  autoComplete="off"
                  placeholder="e.g. ALEX2026"
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                You can continue without an invite code.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <PasswordInput
                id="register-password"
                label="Password"
                autoComplete="new-password"
                placeholder="Create a password"
                value={password}
                onChange={setPassword}
                error={errors.password}
                showStrength
              />
              <PasswordInput
                id="register-confirm"
                label="Confirm password"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                error={errors.confirmPassword}
              />
              <div className="space-y-2">
                <Label htmlFor="terms" className="cursor-pointer items-start gap-2.5">
                  <Checkbox
                    id="terms"
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                    className="mt-0.5"
                  />
                  <span className="text-sm leading-relaxed font-medium">
                    I agree to the{" "}
                    <Link
                      href="/terms"
                      className="font-bold text-primary underline-offset-4 hover:underline"
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/privacy"
                      className="font-bold text-primary underline-offset-4 hover:underline"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </Label>
                <FieldError message={errors.terms} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                We sent a 6-digit code to{" "}
                <span className="font-bold text-foreground">
                  {formatPhoneKE(normalizePhoneKE(phone))}
                </span>
                .
              </p>
              <OtpInput
                value={otp}
                onChange={(value) => {
                  setOtp(value);
                  if (errors.otp) setErrors({});
                }}
                error={errors.otp}
                disabled={otpSending || pending}
                label="Verification code"
              />
              {otpSending ? (
                <div className="rounded-sm border border-dashed border-border bg-muted px-3.5 py-3 text-xs font-semibold text-muted-foreground">
                  Sending your code…
                </div>
              ) : demoCode ? (
                <div className="rounded-sm border border-dashed border-info/40 bg-info-soft/60 px-3.5 py-3 text-xs text-info">
                  <span className="font-bold">Your verification code: {demoCode}</span>. Message
                  delivery is not configured, so the code is shown here.
                </div>
              ) : null}
            </div>
          )}

          <div className="flex items-center gap-2">
            {step > 0 && step < 3 && (
              <Button type="button" variant="outline" size="lg" onClick={handleBack} disabled={pending}>
                Back
              </Button>
            )}
            {step === 1 && (
              <Button type="button" variant="ghost" size="lg" onClick={handleContinue} disabled={pending}>
                Skip
              </Button>
            )}
            {step < 3 ? (
              <Button
                type="button"
                size="lg"
                className="flex-1"
                onClick={handleContinue}
                disabled={pending}
              >
                {pending
                  ? "Creating account…"
                  : step === 2
                    ? "Create account"
                    : "Continue"}
              </Button>
            ) : (
              <Button
                type="button"
                size="lg"
                className="flex-1"
                onClick={handleVerify}
                disabled={pending || otpSending}
              >
                {pending ? "Verifying…" : "Verify & finish"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-bold text-primary underline-offset-4 hover:underline"
        >
          Log in instead
        </Link>
      </p>

    </div>
  );
}

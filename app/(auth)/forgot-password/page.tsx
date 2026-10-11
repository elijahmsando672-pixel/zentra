"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/forms/form-inputs";
import { requestOtp } from "@/lib/services/auth";
import { normalizePhoneKE } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [target, setTarget] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [pending, setPending] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = target.trim();
    let message: string | undefined;
    if (!value) {
      message = "Enter your phone number or email.";
    } else if (value.includes("@")) {
      if (!EMAIL_RE.test(value)) message = "Enter a valid email address.";
    } else {
      const phone = normalizePhoneKE(value);
      if (phone.length !== 12 || !phone.startsWith("254")) {
        message = "Enter a valid Kenyan phone number.";
      }
    }
    if (message) {
      setError(message);
      return;
    }
    setError(undefined);
    setPending(true);
    const res = await requestOtp(value);
    setPending(false);
    if (!res.ok) {
      toast.error(res.message);
      setError(res.message);
      return;
    }
    toast.success("Verification code ready. Message delivery is unavailable.");
    router.push(
      `/reset-password?t=${encodeURIComponent(value)}&c=${encodeURIComponent(res.data.demoCode)}`
    );
  };

  return (
    <div className="animate-fade-up">
      <Card>
        <CardHeader className="gap-1.5 pt-6">
          <CardTitle className="text-2xl font-extrabold tracking-tight">
            Forgot password?
          </CardTitle>
          <CardDescription>
            Enter the phone number or email linked to your account and we&apos;ll send a 6-digit
            verification code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="target">Phone or email</Label>
              <Input
                id="target"
                autoComplete="username"
                placeholder="0712 345 678 or you@example.com"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                aria-invalid={!!error}
              />
              <FieldError message={error} />
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              {pending ? "Sending code…" : "Send verification code"}
            </Button>
          </form>

          <Alert variant="info">
            <AlertDescription>
              Message delivery is not configured, so your reset code will be shown on the next
              screen.
            </AlertDescription>
          </Alert>

          <p className="text-center text-sm text-muted-foreground">
            Remembered it?{" "}
            <Link href="/login" className="font-bold text-primary underline-offset-4 hover:underline">
              Back to log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

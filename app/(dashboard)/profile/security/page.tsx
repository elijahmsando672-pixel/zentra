"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, KeyRound, Laptop, Lock, ShieldCheck, Smartphone } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getPasswordStrength, PasswordInput } from "@/components/forms/form-inputs";
import { TransactionPinInput } from "@/components/forms/code-inputs";
import { PageHeader } from "@/components/shared/page-header";
import { CardSkeleton, ErrorState } from "@/components/shared/states";
import { useApiQuery } from "@/hooks/use-api";
import { DEMO_TRANSACTION_PIN } from "@/lib/constants";
import {
  changePassword,
  getAccountActivitySummary,
  getProfile,
  getSessions,
  revokeAllSessions,
  revokeSession,
  setTransactionPin,
  toggleTwoFactor,
} from "@/lib/services/profile";
import { formatDateTime, relativeTime } from "@/lib/utils";
import { toast } from "sonner";

export default function SecurityPage() {
  const profile = useApiQuery(["profile", "me"], getProfile);
  const sessions = useApiQuery(["profile", "sessions"], getSessions);
  const activity = useApiQuery(["profile", "activity"], getAccountActivitySummary);

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [passwordErrors, setPasswordErrors] = React.useState<Record<string, string>>({});
  const [passwordPending, setPasswordPending] = React.useState(false);

  const [newPin, setNewPin] = React.useState("");
  const [currentPin, setCurrentPin] = React.useState("");
  const [pinErrors, setPinErrors] = React.useState<Record<string, string>>({});
  const [pinPending, setPinPending] = React.useState(false);

  const [twoFactorPending, setTwoFactorPending] = React.useState(false);
  const [revoking, setRevoking] = React.useState<string | null>(null);
  const [revokingAll, setRevokingAll] = React.useState(false);

  const user = profile.data;
  const strength = getPasswordStrength(newPassword);

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!currentPassword) errors.current = "Enter your current password.";
    if (newPassword.length < 8) errors.next = "Use at least 8 characters.";
    if (newPassword !== confirmPassword) errors.confirm = "Passwords do not match.";
    setPasswordErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setPasswordPending(true);
    const res = await changePassword(currentPassword, newPassword);
    setPasswordPending(false);

    if (!res.ok) {
      toast.error(res.message);
      setPasswordErrors(res.fieldErrors ?? {});
      return;
    }

    toast.success("Password changed");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const submitPin = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!/^\d{4}$/.test(newPin)) errors.newPin = "Enter a 4-digit PIN.";
    if (user?.hasTransactionPin && currentPin !== DEMO_TRANSACTION_PIN) {
      errors.currentPin = "Incorrect transaction PIN.";
    }
    setPinErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setPinPending(true);
    const res = await setTransactionPin(newPin, user?.hasTransactionPin ? currentPin : undefined);
    setPinPending(false);

    if (!res.ok) {
      toast.error(res.message);
      setPinErrors(res.fieldErrors ?? {});
      return;
    }

    toast.success("Transaction PIN saved");
    setNewPin("");
    setCurrentPin("");
  };

  const handleTwoFactor = async (enabled: boolean) => {
    setTwoFactorPending(true);
    const res = await toggleTwoFactor(enabled);
    setTwoFactorPending(false);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success(enabled ? "Two-factor authentication enabled" : "Two-factor authentication disabled");
  };

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    const res = await revokeSession(id);
    setRevoking(null);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success("Session revoked");
    void sessions.refetch();
  };

  const handleRevokeAll = async () => {
    setRevokingAll(true);
    const res = await revokeAllSessions();
    setRevokingAll(false);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success("All other sessions signed out");
    void sessions.refetch();
  };

  if (profile.isPending) {
    return (
      <div className="space-y-6 animate-fade-up">
        <PageHeader title="Security centre" breadcrumbs={[{ label: "Profile", href: "/profile" }, { label: "Security" }]} />
        <div className="grid gap-6 lg:grid-cols-2">
          <CardSkeleton lines={5} />
          <CardSkeleton lines={5} />
        </div>
      </div>
    );
  }

  if (profile.isError || !user) {
    return (
      <div className="space-y-6 animate-fade-up">
        <PageHeader title="Security centre" breadcrumbs={[{ label: "Profile", href: "/profile" }, { label: "Security" }]} />
        <ErrorState title="Could not load security settings" description={profile.error?.message} onRetry={() => void profile.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Security centre"
        description="Manage your password, transaction PIN, two-factor authentication, and signed-in devices."
        breadcrumbs={[{ label: "Profile", href: "/profile" }, { label: "Security centre" }]}
        actions={
          <Button asChild variant="outline">
            <Link href="/profile/verification">
              Verification status <ArrowRight />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="size-4" /> Change password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitPassword} className="space-y-4" noValidate>
              <PasswordInput
                id="current-password"
                label="Current password"
                value={currentPassword}
                onChange={setCurrentPassword}
                error={passwordErrors.current}
                autoComplete="current-password"
              />
              <PasswordInput
                id="new-password"
                label="New password"
                value={newPassword}
                onChange={setNewPassword}
                error={passwordErrors.next}
                autoComplete="new-password"
                showStrength
              />
              <PasswordInput
                id="confirm-password"
                label="Confirm new password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                error={passwordErrors.confirm}
                autoComplete="new-password"
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Strength: <span className="font-bold">{strength.label}</span>
                </p>
                <Button type="submit" disabled={passwordPending}>
                  {passwordPending ? "Updating…" : "Update password"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="size-4" /> Transaction PIN
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitPin} className="space-y-4" noValidate>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={user.hasTransactionPin ? "success" : "warning"}>
                  {user.hasTransactionPin ? "PIN set" : "No PIN yet"}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  A 4-digit PIN authorises withdrawals and investments.
                </p>
              </div>

              {user.hasTransactionPin && (
                <div className="space-y-2">
                  <Label>Current PIN</Label>
                  <TransactionPinInput
                    value={currentPin}
                    onChange={setCurrentPin}
                    error={pinErrors.currentPin}
                    disabled={pinPending}
                    label="Current PIN"
                  />
                </div>
              )}

              <div className="space-y-2">
                <TransactionPinInput
                  value={newPin}
                  onChange={setNewPin}
                  error={pinErrors.newPin}
                  disabled={pinPending}
                  label={user.hasTransactionPin ? "New PIN" : "Set your PIN"}
                />
              </div>

              <Alert variant="info">
                <ShieldCheck />
                <AlertTitle>Temporary PIN</AlertTitle>
                <AlertDescription>
                  Your temporary transaction PIN is <span className="numeric font-bold">{DEMO_TRANSACTION_PIN}</span>. Set a personal PIN to secure your account.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end">
                <Button type="submit" disabled={pinPending}>
                  {pinPending ? "Saving…" : user.hasTransactionPin ? "Change PIN" : "Set PIN"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-4" /> Two-factor authentication
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/50 p-4">
              <div className="space-y-1">
                <p className="text-sm font-bold">Require a one-time code at sign-in</p>
                <p className="text-xs text-muted-foreground">
                  Adds an SMS or email code after your password. Recommended for accounts with high balances.
                </p>
              </div>
              <Switch
                checked={user.twoFactorEnabled}
                onCheckedChange={(checked) => void handleTwoFactor(checked)}
                disabled={twoFactorPending}
                aria-label="Toggle two-factor authentication"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Status:{" "}
              <span className={user.twoFactorEnabled ? "font-bold text-success" : "font-bold text-muted-foreground"}>
                {user.twoFactorEnabled ? "Enabled" : "Disabled"}
              </span>
              {twoFactorPending && " · saving…"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Smartphone className="size-4" /> Recent security activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activity.isPending && <CardSkeleton lines={3} />}
            {activity.isError && (
              <ErrorState title="Could not load activity" description={activity.error?.message} onRetry={() => void activity.refetch()} />
            )}
            {activity.data && (
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Last sign-in</dt>
                  <dd className="numeric font-semibold">{formatDateTime(activity.data.lastLoginAt)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Last IP</dt>
                  <dd className="numeric font-semibold">{activity.data.lastLoginIp}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Device</dt>
                  <dd className="font-semibold">{activity.data.device}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Member since</dt>
                  <dd className="numeric font-semibold">{formatDateTime(activity.data.joinedAt)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Open tickets</dt>
                  <dd className="numeric font-semibold">{activity.data.openTickets}</dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Active sessions</CardTitle>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Sign out all others
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sign out other devices?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Every session except this device will be revoked immediately. You will need to sign in again elsewhere.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void handleRevokeAll()} disabled={revokingAll}>
                    {revokingAll ? "Signing out…" : "Sign out others"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions.isPending && (
            <div className="space-y-3">
              <CardSkeleton lines={1} />
              <CardSkeleton lines={1} />
            </div>
          )}
          {sessions.isError && (
            <ErrorState title="Could not load sessions" description={sessions.error?.message} onRetry={() => void sessions.refetch()} />
          )}
          {sessions.data?.map((s) => (
            <div key={s.id} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Laptop className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-bold">{s.device}</p>
                    {s.current && <Badge variant="success">This device</Badge>}
                    {s.status === "revoked" && <Badge variant="outline">Revoked</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {s.browser} · {s.location} · {s.ip}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Last active {relativeTime(s.lastActiveAt)}</p>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={s.current || s.status === "revoked" || revoking === s.id}
                  >
                    {revoking === s.id ? "Revoking…" : "Revoke"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Revoke this session?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {s.device} in {s.location} will be signed out immediately.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void handleRevoke(s.id)}>Revoke session</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

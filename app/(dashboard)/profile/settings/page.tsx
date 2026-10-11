"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell, Info, LogOut, Monitor, Moon, Save } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { PageHeader } from "@/components/shared/page-header";
import { CardSkeleton, ErrorState } from "@/components/shared/states";
import { useApiQuery } from "@/hooks/use-api";
import { logout } from "@/lib/services/auth";
import { getProfile, updateProfile } from "@/lib/services/profile";
import type { User } from "@/lib/types";
import { toast } from "sonner";

type Prefs = User["notificationPreferences"];

const CHANNELS: { key: keyof Prefs; label: string; description: string }[] = [
  { key: "email", label: "Email notifications", description: "Statements, summaries, and account updates by email." },
  { key: "sms", label: "SMS notifications", description: "Short alerts for transactions and security events." },
  { key: "push", label: "Push notifications", description: "Real-time alerts while you are signed in." },
];

const CATEGORIES: { key: keyof Prefs; label: string; description: string }[] = [
  { key: "withdrawals", label: "Withdrawals", description: "Approval, payout, and rejection updates." },
  { key: "earnings", label: "Earnings", description: "Daily credits and maturity reminders." },
  { key: "team", label: "Team activity", description: "New joins, verifications, and reward credits." },
  { key: "promotions", label: "Promotions", description: "Campaigns, coupons, and product launches." },
];

export default function SettingsPage() {
  const router = useRouter();
  const profile = useApiQuery(["profile", "me"], getProfile);

  const [prefs, setPrefs] = React.useState<Prefs | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);

  React.useEffect(() => {
    if (profile.data && !prefs) {
      setPrefs({ ...profile.data.notificationPreferences });
    }
  }, [profile.data, prefs]);

  const setPref = (key: keyof Prefs, value: boolean) => {
    setPrefs((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const save = async () => {
    if (!prefs) return;
    setSaving(true);
    const res = await updateProfile({ notificationPreferences: prefs });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success("Preferences saved for this session");
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    const res = await logout();
    setLoggingOut(false);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success("Signed out");
    router.push("/login");
  };

  if (profile.isPending) {
    return (
      <div className="space-y-6 animate-fade-up">
        <PageHeader title="Settings" breadcrumbs={[{ label: "Profile", href: "/profile" }, { label: "Settings" }]} />
        <CardSkeleton lines={6} />
      </div>
    );
  }

  if (profile.isError || !profile.data || !prefs) {
    return (
      <div className="space-y-6 animate-fade-up">
        <PageHeader title="Settings" breadcrumbs={[{ label: "Profile", href: "/profile" }, { label: "Settings" }]} />
        <ErrorState title="Could not load settings" description={profile.error?.message} onRetry={() => void profile.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Settings"
        description="Control what Zentra sends you, and manage this session."
        breadcrumbs={[{ label: "Profile", href: "/profile" }, { label: "Settings" }]}
        actions={
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : (<><Save /> Save preferences</>)}
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="size-4" /> Notification channels
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {CHANNELS.map((channel) => (
            <div
              key={channel.key}
              className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/50 p-4"
            >
              <div className="space-y-0.5">
                <p className="text-sm font-bold">{channel.label}</p>
                <p className="text-xs text-muted-foreground">{channel.description}</p>
              </div>
              <Switch
                checked={prefs[channel.key]}
                onCheckedChange={(checked) => setPref(channel.key, checked)}
                aria-label={channel.label}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notify me about</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {CATEGORIES.map((category) => (
            <div
              key={category.key}
              className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/50 p-4"
            >
              <div className="space-y-0.5">
                <p className="text-sm font-bold">{category.label}</p>
                <p className="text-xs text-muted-foreground">{category.description}</p>
              </div>
              <Switch
                checked={prefs[category.key]}
                onCheckedChange={(checked) => setPref(category.key, checked)}
                aria-label={category.label}
              />
            </div>
          ))}
          <div className="flex justify-end pt-1">
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : (<><Save /> Save preferences</>)}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Monitor className="size-4" /> Display
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/50 p-4">
          <div className="space-y-0.5">
            <p className="text-sm font-bold">Theme</p>
            <p className="text-xs text-muted-foreground">
              Light and dark mode are controlled from the sun/moon toggle in the top bar — no per-page override here.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
            <Moon className="size-4" />
            <span className="text-xs font-bold">Top bar</span>
          </div>
        </CardContent>
      </Card>

      <Alert variant="info">
        <Info />
        <AlertTitle>Saved for this session</AlertTitle>
        <AlertDescription>
          Preferences are saved in your browser and remain available on this device.
        </AlertDescription>
      </Alert>

      <Card className="border-danger/40">
        <CardHeader>
          <CardTitle className="text-base text-danger">Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-bold">Log out of this session</p>
              <p className="text-xs text-muted-foreground">
                Signs you out on this device and returns you to the login screen.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <LogOut /> Log out
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Log out now?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You will be returned to the sign-in screen. Any unsaved preference toggles will be lost.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Stay signed in</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void handleLogout()} disabled={loggingOut}>
                    {loggingOut ? "Signing out…" : "Log out"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

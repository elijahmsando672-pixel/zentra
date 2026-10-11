"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, PhoneInput } from "@/components/forms/form-inputs";
import { PageHeader } from "@/components/shared/page-header";
import { CardSkeleton, ErrorState } from "@/components/shared/states";
import { useApiQuery } from "@/hooks/use-api";
import { getProfile, updateProfile } from "@/lib/services/profile";
import { toast } from "sonner";

export default function EditProfilePage() {
  const router = useRouter();
  const profile = useApiQuery(["profile", "me"], getProfile);

  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [hydrated, setHydrated] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (profile.data && !hydrated) {
      setFullName(profile.data.fullName);
      setEmail(profile.data.email);
      setPhone(profile.data.phone);
      setHydrated(true);
    }
  }, [profile.data, hydrated]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (fullName.trim().length < 3) errors.fullName = "Enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = "Enter a valid email address.";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setPending(true);
    const res = await updateProfile({ fullName: fullName.trim(), email: email.trim() });
    setPending(false);

    if (!res.ok) {
      toast.error(res.message);
      setFieldErrors(res.fieldErrors ?? {});
      return;
    }

    toast.success("Profile updated");
    router.push("/profile");
  };

  if (profile.isPending) {
    return (
      <div className="space-y-6 animate-fade-up">
        <PageHeader title="Edit profile" breadcrumbs={[{ label: "Profile", href: "/profile" }, { label: "Edit" }]} />
        <CardSkeleton lines={6} />
      </div>
    );
  }

  if (profile.isError || !profile.data) {
    return (
      <div className="space-y-6 animate-fade-up">
        <PageHeader title="Edit profile" breadcrumbs={[{ label: "Profile", href: "/profile" }, { label: "Edit" }]} />
        <ErrorState
          title="Could not load your profile"
          description={profile.error?.message}
          onRetry={() => void profile.refetch()}
        />
      </div>
    );
  }

  const u = profile.data;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Edit profile"
        description="Update your display name and email address. Contact support to change your phone number."
        breadcrumbs={[{ label: "Profile", href: "/profile" }, { label: "Edit profile" }]}
      />

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3" noValidate>
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Mwangi"
                  aria-invalid={!!fieldErrors.fullName}
                  disabled={pending}
                />
                <FieldError message={fieldErrors.fullName} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email address
                  {u.emailVerified && (
                    <Badge variant="success" className="ml-2">
                      <Check className="size-3" /> Verified
                    </Badge>
                  )}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  aria-invalid={!!fieldErrors.email}
                  disabled={pending}
                />
                <FieldError message={fieldErrors.email} />
                {!u.emailVerified && (
                  <p className="text-xs text-muted-foreground">
                    Changing your email resets verification — you will need to confirm the new address.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone-display">Phone number</Label>
                <PhoneInput
                  id="phone-display"
                  value={phone}
                  onChange={setPhone}
                  className="[&_input]:pointer-events-none [&_input]:opacity-70"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={u.phoneVerified ? "success" : "outline"}>
                    {u.phoneVerified ? "Verified" : "Unverified"}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    Phone numbers cannot be changed here. Contact support for assistance.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Button type="button" variant="outline" onClick={() => router.push("/profile")} disabled={pending}>
              <X /> Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : (<><Check /> Save changes</>)}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Account number</span>
                <span className="numeric font-bold">{u.accountNumber}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Rank</span>
                <span className="font-bold capitalize">{u.rank}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Referral code</span>
                <span className="numeric font-bold">{u.referralCode}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Notification preferences live under Settings so this form stays focused.
              </p>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}

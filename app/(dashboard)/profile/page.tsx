"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Laptop, Pencil, Settings, ShieldCheck, UserRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { RankBadge } from "@/components/team/team-components";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { CardSkeleton, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { useApiQuery } from "@/hooks/use-api";
import { RANK_META } from "@/lib/constants";
import { getAccountActivitySummary, getProfile, getSessions } from "@/lib/services/profile";
import { formatDateTime, initials, maskEmail, maskPhone, relativeTime } from "@/lib/utils";
import type { KYCStatus, VerificationStatus } from "@/lib/types";

const KYC_META: Record<KYCStatus, { label: string; tone: string }> = {
  not_started: { label: "KYC not started", tone: "neutral" },
  pending: { label: "KYC pending", tone: "warning" },
  approved: { label: "KYC approved", tone: "success" },
  rejected: { label: "KYC rejected", tone: "danger" },
};

const VERIFICATION_META: Record<VerificationStatus, { label: string; tone: string }> = {
  unverified: { label: "Unverified", tone: "neutral" },
  pending: { label: "Pending review", tone: "warning" },
  verified: { label: "Verified", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
};

const QUICK_LINKS = [
  { href: "/profile/edit", label: "Edit profile", description: "Name, email and phone", icon: Pencil },
  { href: "/profile/security", label: "Security centre", description: "Password, PIN, sessions", icon: ShieldCheck },
  { href: "/profile/verification", label: "Verification", description: "KYC and documents", icon: UserRound },
  { href: "/profile/settings", label: "Settings", description: "Notifications and preferences", icon: Settings },
];

export default function ProfilePage() {
  const profile = useApiQuery(["profile", "me"], getProfile);
  const activity = useApiQuery(["profile", "activity"], getAccountActivitySummary);
  const sessions = useApiQuery(["profile", "sessions"], getSessions);

  const u = profile.data;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Profile"
        description="Your account identity, verification status, and quick access to security settings."
        actions={
          <Button asChild>
            <Link href="/profile/edit">
              <Pencil /> Edit profile
            </Link>
          </Button>
        }
      />

      {profile.isPending && <CardSkeleton lines={6} />}
      {profile.isError && (
        <ErrorState title="Could not load your profile" description={profile.error?.message} onRetry={() => void profile.refetch()} />
      )}

      {u && (
        <Card className="overflow-hidden">
          <CardContent className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="size-16">
                  <AvatarFallback className="bg-brand-navy text-lg text-white">
                    {initials(u.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-extrabold tracking-tight">{u.fullName}</h2>
                    <RankBadge rank={u.rank} />
                  </div>
                  <p className="numeric text-sm font-bold text-muted-foreground">{u.accountNumber}</p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <StatusBadge
                      status={u.verificationStatus}
                      meta={VERIFICATION_META[u.verificationStatus]}
                    />
                    <StatusBadge status={u.kycStatus} meta={KYC_META[u.kycStatus]} />
                    <Badge variant={u.phoneVerified ? "success" : "outline"}>
                      {u.phoneVerified ? "Phone verified" : "Phone unverified"}
                    </Badge>
                    <Badge variant={u.emailVerified ? "success" : "outline"}>
                      {u.emailVerified ? "Email verified" : "Email unverified"}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 sm:text-right">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Joined</p>
                <p className="numeric text-sm font-semibold">{formatDateTime(u.joinedAt)}</p>
              </div>
            </div>

            <Separator />

            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Phone</dt>
                <dd className="numeric mt-1 text-sm font-semibold">{maskPhone(u.phone)}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Email</dt>
                <dd className="mt-1 text-sm font-semibold">{maskEmail(u.email)}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Rank</dt>
                <dd className="mt-1 text-sm font-semibold">{RANK_META[u.rank].label}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Account status</dt>
                <dd className="mt-1 text-sm font-semibold capitalize">{u.status}</dd>
              </div>
            </dl>

            <div className="space-y-2 rounded-lg border border-border bg-muted/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold">Profile completion</p>
                <span className="numeric text-sm font-extrabold">{u.profileCompletion}%</span>
              </div>
              <Progress value={u.profileCompletion} aria-label="Profile completion" />
              {u.profileCompletion < 100 && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <p className="text-xs text-muted-foreground">
                    Add verification details to complete your profile and unlock higher limits.
                  </p>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/profile/edit">
                      Complete your profile <ArrowRight />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="group">
            <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
              <CardContent className="space-y-2 p-5">
                <div className="flex size-10 items-center justify-center rounded-md bg-primary/12 text-primary">
                  <link.icon className="size-5" />
                </div>
                <p className="text-sm font-bold">{link.label}</p>
                <p className="text-xs text-muted-foreground">{link.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Investments"
          value={activity.data?.totalInvestments ?? 0}
          loading={activity.isPending}
          supporting="All-time plans purchased"
        />
        <StatCard
          label="Transactions"
          value={activity.data?.totalTransactions ?? 0}
          loading={activity.isPending}
          supporting="Ledger entries on record"
        />
        <StatCard
          label="Open tickets"
          value={activity.data?.openTickets ?? 0}
          loading={activity.isPending}
          supporting="Awaiting resolution"
          href="/support"
        />
      </div>

      {activity.isError && (
        <ErrorState title="Could not load activity" description={activity.error?.message} onRetry={() => void activity.refetch()} />
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Active sessions</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href="/profile/security">
                Manage <ArrowRight />
              </Link>
            </Button>
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
          {sessions.data?.slice(0, 2).map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3.5 shadow-xs">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Laptop className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-bold">{s.device}</p>
                  {s.current && <Badge variant="success">This device</Badge>}
                  {s.status === "revoked" && <Badge variant="outline">Revoked</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {s.browser} · {s.location} · {s.ip} · active {relativeTime(s.lastActiveAt)}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

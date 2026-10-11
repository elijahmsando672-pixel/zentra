"use client";

import { useMemo } from "react";
import {
  Activity,
  Mail,
  Network,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  CardSkeleton,
  EmptyState,
  ErrorState,
} from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useApiQuery } from "@/hooks/use-api";
import { getAdminTeamMembers as getTeamMembers, getAdminReferralActivity as getReferralActivity, getAdminUsers } from "@/lib/services/admin";
import { RANK_META } from "@/lib/constants";
import { cn, formatCompactKES, formatShortDate, relativeTime } from "@/lib/utils";
import type { ReferralActivity as ReferralActivityItem, TeamMember } from "@/lib/types";

const ACTIVITY_META = {
  signup: { label: "Signup", tone: "info" },
  verified: { label: "Verified", tone: "success" },
  invested: { label: "Invested", tone: "neutral" },
  reward: { label: "Reward", tone: "warning" },
} as const;

const LEVEL_META: Record<number, string> = {
  1: "text-success bg-success-soft",
  2: "text-info bg-info-soft",
  3: "text-warning bg-warning-soft",
};

interface InviterRow {
  sponsor: string;
  direct: number;
  teamSize: number;
  rank: string;
}

export default function ReferralsPage() {
  const team = useApiQuery(["admin", "referrals", "team"], () => getTeamMembers());
  const users = useApiQuery(["admin", "referrals", "users"], () => getAdminUsers({ page: 1 }));
  const activity = useApiQuery(["admin", "referrals", "activity"], getReferralActivity);

  const members = useMemo(() => team.data ?? [], [team.data]);
  const userSample = useMemo(() => users.data?.items ?? [], [users.data?.items]);

  const stats = useMemo(() => {
    const sponsored = userSample.filter((u) => !!u.referredBy).length;
    const orphans = userSample.filter((u) => !u.referredBy).length;
    const directInvites = members.filter((m) => m.level === 1).length;
    const volume = members.reduce((s, m) => s + m.teamVolume, 0);
    return { sponsored, orphans, directInvites, volume };
  }, [members, userSample]);

  const inviters = useMemo<InviterRow[]>(() => {
    const sponsors = new Map<string, { direct: number; teamSize: number }>();
    for (const member of members) {
      const entry = sponsors.get(member.parentName) ?? { direct: 0, teamSize: 0 };
      entry.direct += 1;
      entry.teamSize += 1 + (member.downlineCount ?? 0);
      sponsors.set(member.parentName, entry);
    }
    const rankByName = new Map(userSample.map((u) => [u.fullName, u.rank]));
    return Array.from(sponsors.entries())
      .map(([sponsor, counts]) => ({
        sponsor,
        direct: counts.direct,
        teamSize: counts.teamSize,
        rank: rankByName.get(sponsor) ?? "member",
      }))
      .sort((a, b) => b.direct - a.direct || b.teamSize - a.teamSize)
      .slice(0, 10);
  }, [members, userSample]);

  const levels = useMemo(() => (["1", "2", "3"] as const).map((lvl) => {
    const level = Number(lvl) as 1 | 2 | 3;
    const list = members
      .filter((m) => m.level === level)
      .sort((a, b) => +new Date(b.joinedAt) - +new Date(a.joinedAt));
    return { level, list };
  }), [members]);

  const loading = team.isLoading || users.isLoading || activity.isLoading;
  const errors = [team.error, users.error, activity.error].find(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Referrals"
        description="Sponsor coverage, invite activity and the three-level member network."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Referrals" }]}
        actions={<DemoDataBadge />}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Accounts with sponsor"
          value={loading ? undefined : String(stats.sponsored)}
          icon={<Users className="size-5" />}
          supporting={`of ${userSample.length} sampled accounts`}
          loading={loading}
        />
        <StatCard
          label="Direct invites"
          value={loading ? undefined : String(stats.directInvites)}
          icon={<UserPlus className="size-5" />}
          supporting="Level 1 members"
          loading={loading}
        />
        <StatCard
          label="Orphan accounts"
          value={loading ? undefined : String(stats.orphans)}
          icon={<Mail className="size-5" />}
          supporting={`of ${userSample.length} sampled accounts`}
          loading={loading}
          className={stats.orphans > 0 ? "border-t-2 border-danger" : "border-t-2 border-success"}
        />
        <StatCard
          label="Referral volume"
          value={loading ? undefined : formatCompactKES(stats.volume)}
          icon={<Network className="size-5" />}
          supporting="Team volume, all levels"
          loading={loading}
        />
      </div>

      <Tabs defaultValue="inviters" aria-label="Referral views">
        <TabsList>
          <TabsTrigger value="inviters">
            <Users />
            Top inviters
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity />
            Activity
          </TabsTrigger>
          <TabsTrigger value="tree">
            <Network />
            3-level tree
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inviters" className="space-y-4">
          {loading ? (
            <CardSkeleton lines={5} />
          ) : errors ? (
            <ErrorState
              title="Could not load referrals"
              description={errors.message}
              onRetry={() => {
                void team.refetch();
                void users.refetch();
                void activity.refetch();
              }}
            />
          ) : inviters.length === 0 ? (
            <EmptyState
              title="No inviters found"
              description="Aggregate team members by their sponsor to surface top inviters."
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Sponsor</TableHead>
                      <TableHead className="text-right">Direct count</TableHead>
                      <TableHead className="text-right">Team size</TableHead>
                      <TableHead>Rank</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inviters.map((inviter) => (
                      <TableRow key={inviter.sponsor}>
                        <TableCell className="font-bold">{inviter.sponsor}</TableCell>
                        <TableCell className="numeric text-right font-extrabold">
                          {inviter.direct}
                        </TableCell>
                        <TableCell className="numeric text-right">{inviter.teamSize}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {RANK_META[inviter.rank as keyof typeof RANK_META]?.label ?? "Member"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              <CardSkeleton lines={2} />
              <CardSkeleton lines={2} />
            </div>
          ) : errors ? (
            <ErrorState
              title="Could not load activity"
              description={errors.message}
              onRetry={() => void activity.refetch()}
            />
          ) : !activity.data || activity.data.length === 0 ? (
            <EmptyState
              title="No activity yet"
              description="New signups, verifications and investments will appear here."
            />
          ) : (
            <Card>
              <CardContent className="divide-y divide-border p-0">
                {activity.data.map((item: ReferralActivityItem) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-4 transition-colors hover:bg-muted/40"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md",
                        LEVEL_META[item.level]
                      )}
                    >
                      <Sparkles className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="truncate text-sm font-bold">{item.memberName}</p>
                        <span className="text-[11px] text-muted-foreground">
                          {relativeTime(item.at)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                        {item.detail}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <StatusBadge status={item.event} meta={ACTIVITY_META[item.event] as { label: string; tone: string }} dot />
                        <span className="text-xs text-muted-foreground">
                          Level {item.level}
                        </span>
                        {item.amount !== undefined && (
                          <span className="numeric text-xs font-extrabold text-success">
                            {formatCompactKES(item.amount)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tree" className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <CardSkeleton lines={4} />
              <CardSkeleton lines={4} />
              <CardSkeleton lines={4} />
            </div>
          ) : errors ? (
            <ErrorState
              title="Could not load the team tree"
              description={errors.message}
              onRetry={() => void team.refetch()}
            />
          ) : members.length === 0 ? (
            <EmptyState
              title="Empty network"
              description="No team members exist to build the tree."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {levels.map(({ level, list }) => (
                <Card key={level}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>
                        Level {level}
                        {level === 1 && (
                          <span className="ml-2 text-xs font-semibold text-success">Direct</span>
                        )}
                      </span>
                      <Badge variant="secondary" className="numeric">
                        {list.length}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {level === 1
                        ? "Invited directly by the member"
                        : level === 2
                          ? "Invited by level 1 members"
                          : "Invited by level 2 members"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {list.slice(0, 6).map((member: TeamMember) => (
                      <div key={member.id} className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              aria-hidden
                              className={cn(
                                "size-2 shrink-0 rounded-full",
                                member.active ? "bg-success" : "bg-muted-foreground/40"
                              )}
                            />
                            <span className="truncate text-sm font-semibold">{member.fullName}</span>
                          </div>
                          <span className="numeric shrink-0 text-xs text-muted-foreground">
                            {formatShortDate(member.joinedAt)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pl-4 text-xs text-muted-foreground">
                          <span>
                            Volume{" "}
                            <span className="numeric font-bold text-foreground">
                              {formatCompactKES(member.teamVolume)}
                            </span>
                          </span>
                          <span className="numeric">Downline {member.downlineCount}</span>
                        </div>
                      </div>
                    ))}
                    {list.length > 6 && (
                      <p className="text-xs text-muted-foreground">
                        +{list.length - 6} more at this level
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Alert variant="default">
        <Mail />
        <AlertTitle>Invite-code conventions</AlertTitle>
        <AlertDescription>
          Referral links follow the pattern{" "}
          <span className="numeric font-semibold text-foreground">
            /register?inviteCode=NEX-XXXXXX
          </span>
          . New members must enter a valid code at signup or their account is treated as a sponsorless
          (orphan) account. Codes are uppercase, encoded in the user profile and immutable after
          account creation.
        </AlertDescription>
      </Alert>

      <Separator />

      <p className="text-xs text-muted-foreground">
        Sponsor coverage is computed from a sampled set of accounts returned by the admin users API;
        team figures come from the team roster stored in the database.
      </p>
    </div>
  );
}

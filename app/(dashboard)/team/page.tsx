"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, ArrowRight, Gift, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StatCard } from "@/components/shared/stat-card";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/shared/states";
import {
  CommissionBreakdownCard,
  RankProgressCard,
  TeamMemberCard,
} from "@/components/team/team-components";
import { useApiQuery } from "@/hooks/use-api";
import { getReferralActivity, getTeamMembers, getTeamSummary } from "@/lib/services/team";
import { formatCompactKES, formatKES, relativeTime } from "@/lib/utils";
import type { ReferralActivity, TeamMember } from "@/lib/types";

const EVENT_META: Record<ReferralActivity["event"], { label: string; variant: "info" | "success" | "warning" }> = {
  signup: { label: "Joined", variant: "info" },
  verified: { label: "Verified", variant: "success" },
  invested: { label: "Invested", variant: "success" },
  reward: { label: "Reward", variant: "warning" },
};

export default function TeamPage() {
  const summary = useApiQuery(["team", "summary"], getTeamSummary);
  const members = useApiQuery<TeamMember[]>(["team", "members"], () => getTeamMembers());
  const activity = useApiQuery(["team", "activity"], getReferralActivity);

  const [level, setLevel] = React.useState("all");
  const [query, setQuery] = React.useState("");

  const allMembers = React.useMemo(() => members.data ?? [], [members.data]);
  const counts = {
    all: allMembers.length,
    "1": allMembers.filter((m) => m.level === 1).length,
    "2": allMembers.filter((m) => m.level === 2).length,
    "3": allMembers.filter((m) => m.level === 3).length,
  };

  const filteredMembers = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return allMembers.filter((m) => {
      const matchesLevel = level === "all" || m.level === Number(level);
      const matchesQuery =
        !q ||
        m.fullName.toLowerCase().includes(q) ||
        m.parentName.toLowerCase().includes(q) ||
        m.maskedPhone.includes(q);
      return matchesLevel && matchesQuery;
    });
  }, [allMembers, level, query]);

  const s = summary.data;
  const activePercent = s && s.totalMembers > 0 ? Math.round((s.activeMembers / s.totalMembers) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Team & referrals"
        description="Grow your three-level team, track rank progress, and watch commissions accumulate."
        actions={
          <>
            <DemoDataBadge />
            <Button asChild>
              <Link href="/team/referrals">
                <UserPlus /> Invite people
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total members" value={s?.totalMembers ?? 0} icon={<Users className="size-5" />} loading={summary.isPending} supporting={s ? `${s.directReferrals} direct` : undefined} />
        <StatCard label="Direct referrals" value={s?.directReferrals ?? 0} icon={<UserPlus className="size-5" />} loading={summary.isPending} supporting="Level 1 members" />
        <StatCard label="Active members" value={s?.activeMembers ?? 0} icon={<Activity className="size-5" />} loading={summary.isPending} supporting={s ? `${activePercent}% of team active` : undefined} />
        <StatCard label="Team volume" value={s ? formatCompactKES(s.totalVolume) : "KES 0"} icon={<Activity className="size-5" />} loading={summary.isPending} supporting="All-time generated volume" />
        <StatCard label="Rewards earned" value={s ? formatKES(s.totalRewards, { decimals: 0 }) : "KES 0"} icon={<Gift className="size-5" />} loading={summary.isPending} supporting="Claimed commissions" />
        <StatCard label="Pending rewards" value={s ? formatKES(s.pendingRewards, { decimals: 0 }) : "KES 0"} icon={<Gift className="size-5" />} loading={summary.isPending} supporting="Awaiting confirmation" />
      </div>

      {summary.isError && (
        <ErrorState title="Could not load your team summary" description={summary.error?.message} onRetry={() => void summary.refetch()} />
      )}

      {summary.isPending && !summary.isError && (
        <div className="grid gap-6 lg:grid-cols-3">
          <CardSkeleton className="lg:col-span-2" lines={5} />
          <CardSkeleton lines={5} />
        </div>
      )}

      {s && (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <RankProgressCard
              className="lg:col-span-2"
              currentRank={s.currentRank}
              nextRank={s.nextRank}
              progress={s.rankProgress}
              criteria={s.rankCriteria}
            />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent members</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {s.recentMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No members yet. Share your invite link to get started.</p>
                ) : (
                  s.recentMembers.map((m) => <TeamMemberCard key={m.id} member={m} />)
                )}
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/team/referrals">
                    Invite more people <ArrowRight />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold tracking-tight">Commission breakdown</h2>
              <DemoDataBadge />
            </div>
            <CommissionBreakdownCard levels={s.levels} />
          </div>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={level} onValueChange={setLevel}>
              <TabsList>
                <TabsTrigger value="all">All · {counts.all}</TabsTrigger>
                <TabsTrigger value="1">L1 · {counts["1"]}</TabsTrigger>
                <TabsTrigger value="2">L2 · {counts["2"]}</TabsTrigger>
                <TabsTrigger value="3">L3 · {counts["3"]}</TabsTrigger>
              </TabsList>
            </Tabs>
            <SearchInput value={query} onChange={setQuery} placeholder="Search members…" className="sm:max-w-72" />
          </div>

          {members.isPending && (
            <div className="grid gap-3 md:grid-cols-2">
              <CardSkeleton lines={2} />
              <CardSkeleton lines={2} />
              <CardSkeleton lines={2} />
              <CardSkeleton lines={2} />
            </div>
          )}

          {members.isError && (
            <ErrorState title="Could not load team members" description={members.error?.message} onRetry={() => void members.refetch()} />
          )}

          {members.data && filteredMembers.length === 0 && (
            <EmptyState
              title="No members found"
              description={
                query
                  ? "No members match your search. Try a different name or clear the filters."
                  : "This level has no members yet. Share your invite link to start building your team."
              }
              action={
                <Button asChild variant="outline">
                  <Link href="/team/referrals">Open invite centre</Link>
                </Button>
              }
            />
          )}

          {filteredMembers.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredMembers.map((m) => (
                <TeamMemberCard key={m.id} member={m} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Recent activity</CardTitle>
            <Button asChild variant="link" size="sm">
              <Link href="/team/rewards">
                View rewards <ArrowRight />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {activity.isPending && (
            <div className="space-y-3">
              <CardSkeleton lines={1} />
              <CardSkeleton lines={1} />
              <CardSkeleton lines={1} />
            </div>
          )}

          {activity.isError && (
            <ErrorState title="Could not load activity" description={activity.error?.message} onRetry={() => void activity.refetch()} />
          )}

          {activity.data && activity.data.length === 0 && (
            <EmptyState title="No referral activity yet" description="Signups, deposits and rewards from your network will appear here." />
          )}

          {activity.data && activity.data.length > 0 && (
            <ul className="space-y-3">
              {activity.data.slice(0, 8).map((a) => {
                const meta = EVENT_META[a.event];
                return (
                  <li key={a.id} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3.5 shadow-xs">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-bold">{a.memberName}</p>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                        <Badge variant="outline" className="text-[10px]">
                          L{a.level}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{a.detail}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      {a.amount !== undefined && (
                        <p className="numeric text-sm font-extrabold">{formatKES(a.amount, { decimals: 0 })}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground">{relativeTime(a.at)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

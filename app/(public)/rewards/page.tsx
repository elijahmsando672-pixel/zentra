"use client";

import Link from "next/link";
import { ArrowRight, Gift, Percent, Share2, Sparkles, Trophy, Users } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { RankBadge, CommissionBreakdownCard } from "@/components/team/team-components";
import { RANKS } from "@/lib/constants";
import { formatCompactKES, formatKES, formatPercent } from "@/lib/utils";

const demoLevels = [
  { level: 1 as const, label: "Direct referrals", members: 6, volume: 180_000, rewards: 25_200, ratePercent: 14 },
  { level: 2 as const, label: "Second level", members: 14, volume: 350_000, rewards: 21_000, ratePercent: 6 },
  { level: 3 as const, label: "Third level", members: 26, volume: 600_000, rewards: 15_000, ratePercent: 2.5 },
];

const bonuses = [
  {
    icon: Gift,
    title: "Welcome bonus",
    body: "Eligible accounts can redeem an active starter coupon for a bonus wallet credit.",
  },
  {
    icon: Sparkles,
    title: "Seasonal campaigns",
    body: "Limited-time campaigns boost reward rates or award prizes to the most active teams.",
  },
  {
    icon: Percent,
    title: "Cashback & fee waivers",
    body: "Coupon codes can return a percentage of an amount or waive withdrawal fees for a period.",
  },
];

export default function RewardsPage() {
  const demoTotal = demoLevels.reduce((sum, level) => sum + level.rewards, 0);

  return (
    <div>
      <section className="gradient-hero relative overflow-hidden border-b border-border">
        <div className="grid-pattern absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-5">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                Rewards program
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight text-balance text-white sm:text-5xl">
                Grow a team, climb the ranks
              </h1>
              <p className="text-sm leading-relaxed text-white/70 sm:text-base">
                Zentra rewards you across three levels of your team. Invite people, help them get
                started, and earn at higher rates as your rank rises.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <DemoDataBadge />
              <Button asChild size="lg">
                <Link href="/register">
                  Start earning rewards
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="mb-8 space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            The rank ladder
          </p>
          <h2 className="text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">
            Six ranks, better rates at every step
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Ranks are earned by direct referrals, total team size and team volume. Rates and
            thresholds shown here apply to the current rewards programme.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RANKS.map((rank) => (
            <Card key={rank.key} className="shadow-xs">
              <CardHeader className="pb-0">
                <CardTitle className="flex items-center justify-between gap-3">
                  <RankBadge rank={rank.key} />
                  <Trophy className="size-4 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <dl className="grid grid-cols-3 gap-2 rounded-md border border-border bg-muted/40 p-3">
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Direct
                    </dt>
                    <dd className="numeric mt-0.5 text-sm font-extrabold">{rank.minDirect}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Team
                    </dt>
                    <dd className="numeric mt-0.5 text-sm font-extrabold">{rank.minTeamSize}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Volume
                    </dt>
                    <dd className="numeric mt-0.5 text-sm font-extrabold">
                      {formatCompactKES(rank.minVolume)}
                    </dd>
                  </div>
                </dl>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Commission rates
                  </p>
                  <ul className="space-y-1.5">
                    <li className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        <Users className="mr-1.5 inline size-3.5" />
                        Level 1 — direct referrals
                      </span>
                      <span className="numeric font-extrabold text-success">
                        {formatPercent(rank.rewardsRate.level1)}
                      </span>
                    </li>
                    <li className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Level 2 — their referrals</span>
                      <span className="numeric font-extrabold text-success">
                        {formatPercent(rank.rewardsRate.level2)}
                      </span>
                    </li>
                    <li className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Level 3 — the level below</span>
                      <span className="numeric font-extrabold text-success">
                        {formatPercent(rank.rewardsRate.level3)}
                      </span>
                    </li>
                  </ul>
                </div>

                <ul className="flex flex-wrap gap-1.5">
                  {rank.perks.map((perk) => (
                    <li key={perk}>
                      <Badge variant="outline" className="text-[10px]">
                        {perk}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Commission example
              </p>
              <h2 className="text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">
                A month at Gold rank
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                An illustrative example using Gold rates and sample team activity, so you can see how
                the three levels add up.
              </p>
            </div>
            <DemoDataBadge label="Example figures" />
          </div>

          <CommissionBreakdownCard levels={demoLevels} />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-5 shadow-xs">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Illustrative monthly rewards
              </p>
              <p className="numeric text-2xl font-extrabold tracking-tight text-success">
                {formatKES(demoTotal, { decimals: 0 })}
              </p>
            </div>
            <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
              Example only. Your reward amount depends on qualifying activity and the programme
              rules that apply to your account.
            </p>
          </div>

          <Alert variant="info" className="mt-6">
            <Percent />
            <AlertTitle>How rewards are triggered</AlertTitle>
            <AlertDescription>
              Rewards accrue on qualifying investments made by members in your three levels, at the
              rates set by your current rank. Reversals can occur if a source transaction fails or
              is refunded.
            </AlertDescription>
          </Alert>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="mb-8 space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Bonuses & campaigns
          </p>
          <h2 className="text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">
            More ways to earn
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Beyond daily commissions, eligible members may access bonuses, coupons and seasonal
            campaigns.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bonuses.map((bonus) => (
            <Card key={bonus.title} className="shadow-xs">
              <CardContent className="space-y-3 p-5">
                <span className="flex size-10 items-center justify-center rounded-md bg-gold-soft text-gold">
                  <bonus.icon className="size-5" />
                </span>
                <h3 className="text-base font-extrabold tracking-tight">{bonus.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{bonus.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-lg border border-border bg-card p-6 shadow-xs sm:flex-row sm:items-center">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Share2 className="size-4 text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Your invite link
              </p>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Create a free account to get your invite code, share it anywhere, and start building
              a three-level team.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button asChild variant="outline">
              <Link href="/faq">Read the FAQ</Link>
            </Button>
            <Button asChild>
              <Link href="/register">
                Create free account
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

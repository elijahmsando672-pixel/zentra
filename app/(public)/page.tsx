"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Gift,
  Headphones,
  Layers,
  Lock,
  Network,
  Package,
  Receipt,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { CardSkeleton, ErrorState } from "@/components/shared/states";
import { StatCard } from "@/components/shared/stat-card";
import { ProductCard } from "@/components/products/product-components";
import { RankBadge } from "@/components/team/team-components";
import { getFeaturedProducts } from "@/lib/services/products";
import { getMarketingStats } from "@/lib/services/dashboard";
import { APP_TAGLINE, RANKS } from "@/lib/constants";
import { formatCompactKES, formatKES, formatNumber, formatPercent } from "@/lib/utils";
import { useApiQuery } from "@/hooks/use-api";

function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1.5">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{eyebrow}</p>
        <h2 className="text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">{title}</h2>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

const steps = [
  {
    icon: UserPlus,
    title: "Create account",
    body: "Sign up free with your phone number and finish verification in minutes.",
  },
  {
    icon: Smartphone,
    title: "Fund your wallet",
    body: "Choose an enabled payment method. M-Pesa becomes available after operations configures a Till number.",
  },
  {
    icon: Layers,
    title: "Choose a plan",
    body: "Pick a Starter, Growth or Elite product that matches your goal and budget.",
  },
  {
    icon: TrendingUp,
    title: "Earn daily & withdraw",
    body: "Daily earnings credit to your wallet and withdrawals pay out to M-Pesa.",
  },
];

const features = [
  {
    icon: Smartphone,
    title: "Flexible payment setup",
    body: "Members see only enabled payment methods. M-Pesa deposits stay unavailable until a Till number is configured.",
  },
  {
    icon: ShieldCheck,
    title: "Transparent projections",
    body: "Every plan shows its daily earning, duration and total payout before you commit.",
  },
  {
    icon: Network,
    title: "Three-level team rewards",
    body: "Earn on your direct referrals and the two levels beneath them, tracked automatically.",
  },
  {
    icon: Lock,
    title: "Security by default",
    body: "Transaction PINs, two-factor prompts and device sessions protect every account.",
  },
  {
    icon: Gift,
    title: "Bonuses & campaigns",
    body: "Seasonal campaigns, coupon codes and cashback rewards land in your bonus wallet.",
  },
  {
    icon: Headphones,
    title: "Human support",
    body: "Reach the team on WhatsApp or open a ticket with clear status tracking.",
  },
];

const faqPreview = [
  {
    q: "How do I review an investment plan?",
    a: "Each plan displays its entry range, duration and projected payout. Review the plan terms and risks before committing funds.",
  },
  {
    q: "How do deposits work?",
    a: "Deposits use the payment methods enabled by operations. M-Pesa is available only when the required Till and live payment credentials are configured. If a prompt is simulated, the payment screen will say so.",
  },
  {
    q: "When can I withdraw my earnings?",
    a: "Earnings become available according to the plan terms and the status shown in your account. Withdrawal requests may require review and provider confirmation.",
  },
  {
    q: "How are team rewards calculated?",
    a: "Rewards use a three-level structure with rates and eligibility set by the programme rules shown in your account.",
  },
];

export default function HomePage() {
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useApiQuery(["public-home"], getMarketingStats);

  const {
    data: featured,
    isLoading: featuredLoading,
    error: featuredError,
    refetch: refetchFeatured,
  } = useApiQuery(["public-featured"], getFeaturedProducts);

  const statItems = stats
    ? [
        { label: "Active members", value: formatNumber(stats.activeMembers), icon: <Users className="size-5 text-primary" />, support: "Members with active accounts" },
        { label: "Product plans", value: formatNumber(stats.productsAvailable), icon: <Package className="size-5 text-info" />, support: "Available in the catalogue" },
        { label: "Rewards tracked", value: formatNumber(stats.rewardsTracked), icon: <Gift className="size-5 text-gold" />, support: "Team rewards recorded" },
        { label: "Transactions", value: formatNumber(stats.transactionsProcessed), icon: <Receipt className="size-5 text-success" />, support: "Recorded in the transaction ledger" },
      ]
    : [];

  return (
    <div>
      <section className="gradient-hero relative overflow-hidden">
        <div className="grid-pattern absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="max-w-3xl space-y-7">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              Zentra · Investment and rewards
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight text-balance text-white sm:text-6xl">
              {APP_TAGLINE}
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
              Explore investment plans, track earnings in your wallet and manage three-level team
              rewards from one account.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/register">
                  Create free account
                  <ArrowRight />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/25 bg-white/10 text-white hover:bg-white/15"
              >
                <Link href="/products">Explore products</Link>
              </Button>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-3 pt-1">
              {["Configurable payments", "Transparent projections", "3-level team rewards"].map((item) => (
                <li key={item} className="inline-flex items-center gap-2 text-sm text-white/70">
                  <Check className="size-4 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Platform snapshot
              </p>
              <p className="text-sm text-muted-foreground">
                Some figures and account records are illustrative examples.
              </p>
            </div>
            <DemoDataBadge />
          </div>

          {statsError ? (
            <ErrorState
              title="Snapshot unavailable"
              description={statsError.message}
              onRetry={() => refetchStats()}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statsLoading
                ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} lines={2} />)
                : statItems.map((stat) => (
                    <StatCard
                      key={stat.label}
                      label={stat.label}
                      value={stat.value}
                      icon={stat.icon}
                      supporting={stat.support}
                    />
                  ))}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Featured plans"
            title="Start with a plan that fits"
            description="Explore plans by entry amount, duration and projected daily earnings. Review terms before you invest."
            action={
              <div className="flex items-center gap-2">
                <DemoDataBadge />
                <Button asChild variant="outline">
                  <Link href="/products">
                    View all products
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            }
          />
        </Reveal>

        {featuredError ? (
          <ErrorState
            title="Products unavailable"
            description={featuredError.message}
            onRetry={() => refetchFeatured()}
          />
        ) : featuredLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} lines={5} />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(featured ?? []).map((product) => (
              <ProductCard key={product.id} product={product} guest />
            ))}
          </div>
        )}
      </section>

      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <Reveal>
            <SectionHeading
              eyebrow="How it works"
              title="Four steps from signup to payout"
              description="The whole flow is designed around the way people already use M-Pesa."
              action={
                <Button asChild variant="outline">
                  <Link href="/how-it-works">
                    See the full guide
                    <ArrowRight />
                  </Link>
                </Button>
              }
            />
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <Card key={step.title} className="shadow-xs">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between">
                    <span className="flex size-10 items-center justify-center rounded-md bg-primary/15 text-primary">
                      <step.icon className="size-5" />
                    </span>
                    <span className="numeric text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                      Step {i + 1}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold tracking-tight">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Team rewards"
            title="Rise through six ranks"
            description="Every rank sets eligibility and commission rates for your three-level team rewards."
            action={
              <div className="flex items-center gap-2">
                <DemoDataBadge />
                <Button asChild variant="outline">
                  <Link href="/rewards">
                    Explore rewards
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            }
          />
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RANKS.map((rank) => (
            <Card key={rank.key} className="shadow-xs">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <RankBadge rank={rank.key} />
                  <span className="numeric text-[11px] text-muted-foreground">
                    from {formatCompactKES(rank.minVolume)} volume
                  </span>
                </div>
                <dl className="grid grid-cols-3 gap-2 rounded-md border border-border bg-muted/40 p-3">
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Level 1
                    </dt>
                    <dd className="numeric mt-0.5 text-sm font-extrabold text-success">
                      {formatPercent(rank.rewardsRate.level1)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Level 2
                    </dt>
                    <dd className="numeric mt-0.5 text-sm font-extrabold text-success">
                      {formatPercent(rank.rewardsRate.level2)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Level 3
                    </dt>
                    <dd className="numeric mt-0.5 text-sm font-extrabold text-success">
                      {formatPercent(rank.rewardsRate.level3)}
                    </dd>
                  </div>
                </dl>
                <p className="text-xs text-muted-foreground">
                  Requires {rank.minDirect} direct referrals · team of {rank.minTeamSize}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <Reveal>
            <SectionHeading
              eyebrow="Why Zentra"
              title="Built for clarity, not complexity"
              description="A modern fintech experience where every number explains itself."
            />
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="shadow-xs">
                <CardContent className="space-y-3 p-5">
                  <span className="flex size-10 items-center justify-center rounded-md bg-secondary text-foreground">
                    <feature.icon className="size-5" />
                  </span>
                  <h3 className="text-base font-extrabold tracking-tight">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <SectionHeading
            eyebrow="FAQ"
            title="Quick answers"
            action={
              <Button asChild variant="outline">
                <Link href="/faq">
                  All questions
                  <ArrowRight />
                </Link>
              </Button>
            }
          />
          <Accordion type="single" collapsible className="rounded-lg border border-border bg-card px-5">
            {faqPreview.map((item) => (
              <AccordionItem key={item.q} value={item.q}>
                <AccordionTrigger>{item.q}</AccordionTrigger>
                <AccordionContent>{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="gradient-navy relative overflow-hidden text-white">
        <div className="grid-pattern absolute inset-0 opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-2xl space-y-6 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Get started</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
              Ready to build your next level?
            </h2>
            <p className="text-sm leading-relaxed text-white/70 sm:text-base">
              Create an account, explore the catalogue and review the available investment plans.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/register">
                  Create free account
                  <ArrowRight />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/25 bg-white/10 text-white hover:bg-white/15"
              >
                <Link href="/contact">Talk to support</Link>
              </Button>
            </div>
            <p className="text-xs leading-relaxed text-white/50">
              Projections are estimates, not promises of returns. Payment availability depends on
              the method and provider shown during checkout.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

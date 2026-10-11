"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Gift,
  Layers,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { formatKES } from "@/lib/utils";

const flow = [
  {
    id: "create",
    icon: UserPlus,
    title: "Create and verify your account",
    body: "Sign up with your phone number, set a transaction PIN and complete the verification steps available for your account. Verification may be required to access some features.",
    points: [
      "Free registration with name, phone and email",
      "Phone OTP and optional email confirmation",
      "Profile completion checklist inside the dashboard",
    ],
  },
  {
    id: "deposit",
    icon: Smartphone,
    title: "Fund your wallet",
    body: "Choose an enabled payment method. M-Pesa deposits are available only when a Till number and live credentials are configured. If a prompt is simulated, the payment screen will say so.",
    points: [
      `Minimum deposit ${formatKES(100, { decimals: 0 })} · maximum ${formatKES(250000, { decimals: 0 })}`,
      "M-Pesa is unavailable until a Till is configured",
      "Funds land in your deposit wallet, ready to invest",
    ],
  },
  {
    id: "plan",
    icon: Layers,
    title: "Pick an investment plan",
    body: "Browse the catalogue by tier — Starter, Growth or Elite. Each plan publishes its minimum entry, duration, daily earning at entry and total payout multiplier so you can compare before committing.",
    points: [
      "Use the plan calculator to model any entry amount",
      "Capacity bars show how full each plan is",
      "Confirm with your transaction PIN to activate",
    ],
  },
  {
    id: "earn",
    icon: TrendingUp,
    title: "Daily earnings and maturity",
    body: "Once active, a plan credits a scheduled earning every day into your earnings wallet. You can follow each day on the earning schedule, and at maturity the principal and totals are settled according to the plan terms.",
    points: [
      "Daily schedule with credited, scheduled and skipped states",
      "Live progress against the maturity date",
      "Certificates and statements generated in the app",
    ],
  },
  {
    id: "withdraw",
    icon: Banknote,
    title: "Withdraw to M-Pesa",
    body: "Request a withdrawal to your saved M-Pesa payout account. A PIN check, a risk review and a two-step approval simulation protect the flow, and you can follow every stage on the transaction timeline.",
    points: [
      `Minimum withdrawal ${formatKES(500, { decimals: 0 })} with a 1.5% processing fee`,
      "PIN and OTP verification before processing",
      "Status tracking from approval to payout",
    ],
  },
  {
    id: "team",
    icon: Gift,
    title: "Invite your team and earn three levels",
    body: "Share your invite link or code. When people join beneath you they become level 1, their referrals become level 2, and the level below that becomes level 3. Rewards accrue at your rank's rates and appear in your team rewards wallet.",
    points: [
      "Three levels deep, tracked automatically",
      "Rank upgrades raise your commission rates",
      "Bonuses and seasonal campaigns on top",
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <div>
      <section className="gradient-hero relative overflow-hidden border-b border-border">
        <div className="grid-pattern absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="max-w-2xl space-y-5">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">The journey</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-balance text-white sm:text-5xl">
              How Zentra works
            </h1>
            <p className="text-sm leading-relaxed text-white/70 sm:text-base">
              From signup to payout, follow the flow below. Payment options depend on enabled
              methods and provider availability.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-white/20 bg-white/10 text-white">6 simple steps</Badge>
              <Badge className="border-white/20 bg-white/10 text-white">Configurable payments</Badge>
              <Badge className="border-white/20 bg-white/10 text-white">Step-by-step guide</Badge>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <Alert variant="info" className="mb-10">
          <ShieldCheck />
          <AlertTitle>Payment and verification availability</AlertTitle>
          <AlertDescription>
            Some payment prompts and verification steps may be simulated when a live provider is
            unavailable. Follow the notices shown during each payment or verification flow.
          </AlertDescription>
        </Alert>

        <div className="space-y-8">
          {flow.map((step, i) => (
            <div key={step.id} className="grid gap-4 sm:grid-cols-[auto_1fr] sm:gap-6">
              <div className="flex items-start gap-4 sm:flex-col sm:gap-3">
                <span className="numeric flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-primary text-sm font-extrabold text-primary">
                  {i + 1}
                </span>
                <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground">
                  <step.icon className="size-5" />
                </span>
              </div>
              <Card className="shadow-xs">
                <CardContent className="space-y-4 p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-extrabold tracking-tight">{step.title}</h2>
                    {i === 1 && <DemoDataBadge label="Simulated" />}
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                  <Separator />
                  <ul className="space-y-2">
                    {step.points.map((point) => (
                      <li
                        key={point}
                        className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground"
                      >
                        <BadgeCheck className="mt-0.5 size-4 shrink-0 text-success" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-muted/40">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                See it for yourself
              </p>
              <h2 className="text-2xl font-extrabold tracking-tight text-balance">
                Ready to walk through the flow?
              </h2>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                Create an account and review available plans, payment options and terms before
                proceeding.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button asChild variant="outline">
                <Link href="/products">Browse products</Link>
              </Button>
              <Button asChild>
                <Link href="/register">
                  Create free account
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

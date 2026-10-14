"use client";

import Link from "next/link";
import {
  ArrowRight,
  Gift,
  Headphones,
  LifeBuoy,
  Lock,
  Package,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/shared/page-header";

const categories = [
  {
    id: "accounts",
    title: "Accounts",
    icon: UserRound,
    items: [
      {
        q: "How do I create a Zentra account?",
        a: "Tap Create free account, enter your name, phone number and email, then complete the verification steps available for your account. If code delivery is unavailable, the verification page will explain how to proceed.",
      },
      {
        q: "Is it free to join?",
        a: "Creating an account is free. Product fees, payment availability and any applicable charges are shown before you confirm a transaction.",
      },
      {
        q: "How does verification work?",
        a: "Verification steps depend on the checks enabled for your account. Your dashboard shows the current status and any additional steps required.",
      },
      {
        q: "Can I register more than one account?",
        a: "Account registration is subject to the account rules and verification checks shown during sign-up.",
      },
    ],
  },
  {
    id: "deposits",
    title: "Deposits & withdrawals",
    icon: Wallet,
    items: [
      {
        q: "How do I deposit funds?",
        a: "Open your wallet and choose an enabled payment method. M-Pesa deposits are available only after a Till number and live credentials are configured. If a prompt is simulated, the deposit page will say so; simulated prompts do not move real money.",
      },
      {
        q: "What are the deposit limits?",
        a: "Current deposit limits are shown on the deposit page before you submit a request.",
      },
      {
        q: "How long do withdrawals take?",
        a: "Withdrawal requests may pass through PIN verification, account review, approval and provider payout stages. Follow the status shown in your account; processing status does not confirm payment.",
      },
      {
        q: "What fees apply to withdrawals?",
        a: "Any applicable withdrawal fee is displayed on the withdrawal screen before you confirm.",
      },
    ],
  },
  {
    id: "products",
    title: "Products",
    icon: Package,
    items: [
      {
        q: "How are daily earnings calculated?",
        a: "Each plan shows its rate, duration and projected earnings. Projections are estimates, not guaranteed returns; actual results may differ.",
      },
      {
        q: "What happens when a plan matures?",
        a: "At maturity the plan moves to completed status and the settlement amount is released to your wallet according to the plan terms. Schedules and statements remain visible afterwards.",
      },
      {
        q: "Can I cancel or top up an active plan?",
        a: "Plan terms explain whether top-ups or early cancellation are available. Review them before committing funds.",
      },
    ],
  },
  {
    id: "team",
    title: "Team & rewards",
    icon: Gift,
    items: [
      {
        q: "How does the three-level team structure work?",
        a: "People who join with your invite code become your level 1. Their referrals are level 2, and the level below that is level 3. Rewards accrue on qualifying activity across all three levels.",
      },
      {
        q: "How do ranks affect my earnings?",
        a: "Six ranks — Member through Diamond — set commission rates across three levels. Rank eligibility is based on the requirements shown in the rewards programme.",
      },
      {
        q: "When are team rewards paid?",
        a: "Eligible rewards appear in your team rewards wallet as activity is recorded. Check each reward's status and programme terms.",
      },
    ],
  },
  {
    id: "security",
    title: "Security",
    icon: Lock,
    items: [
      {
        q: "How is my account protected?",
        a: "Accounts use a four-digit transaction PIN for sensitive actions, optional two-factor authentication, OTP checks for withdrawals, and visible device sessions you can revoke at any time.",
      },
      {
        q: "Does Zentra store my account information?",
        a: "Account and support information you submit is sent to the service database. Some preloaded balances and transactions may be sample records. Payment and identity verification providers may not be connected for every method.",
      },
      {
        q: "How do I report suspicious activity?",
        a: "Use the contact page to reach support on WhatsApp, Telegram or email, and describe what you saw.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <div>
      <section className="gradient-hero relative overflow-hidden border-b border-border">
        <div className="grid-pattern absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="max-w-2xl space-y-5">
            <p className="text-xs font-bold uppercase tracking-widest text-accent-strong">Help centre</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-balance text-foreground sm:text-5xl">
              Frequently asked questions
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Straight answers about accounts, money movement, products, rewards and security.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <Breadcrumbs
          items={[{ label: "Home", href: "/" }, { label: "FAQ" }]}
          className="mb-6"
        />

        <nav aria-label="FAQ categories" className="mb-8">
          <ul className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <li key={category.id}>
                <a
                  href={`#${category.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-bold text-muted-foreground shadow-xs transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <category.icon className="size-3.5" />
                  {category.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-10">
          {categories.map((category) => (
            <section key={category.id} id={category.id} className="scroll-mt-24 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-md bg-primary/15 text-primary">
                    <category.icon className="size-4" />
                  </span>
                  <h2 className="text-lg font-extrabold tracking-tight">{category.title}</h2>
                </div>
                <Badge variant="secondary">{category.items.length} questions</Badge>
              </div>

              <Accordion
                type="single"
                collapsible
                className="rounded-lg border border-border bg-card px-5"
              >
                {category.items.map((item) => (
                  <AccordionItem key={item.q} value={item.q}>
                    <AccordionTrigger>{item.q}</AccordionTrigger>
                    <AccordionContent>{item.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-muted/40">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
          <Card className="shadow-xs">
            <CardContent className="flex flex-col items-start justify-between gap-5 p-6 sm:flex-row sm:items-center">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <LifeBuoy className="size-4 text-primary" />
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Still need help?
                  </p>
                </div>
                <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                  Send a message through a support channel and the team will get back to you as soon as possible.
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button asChild variant="outline">
                  <Link href="/contact">
                    <Headphones />
                    Contact support
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/register">
                    Create free account
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Payment and verification availability can vary by method and account.
          </p>
        </div>
      </section>
    </div>
  );
}

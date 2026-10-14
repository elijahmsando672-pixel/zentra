"use client";

import Link from "next/link";
import { ArrowRight, Compass, Eye, HeartHandshake, Lightbulb, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/shared/page-header";

const values = [
  {
    icon: Eye,
    title: "Radical clarity",
    body: "Every rate, fee and projection is shown before you commit. If a number cannot be explained in plain language, it does not belong on the screen.",
  },
  {
    icon: ShieldCheck,
    title: "Safety first",
    body: "PINs, OTPs, risk reviews and device sessions are treated as first-class experiences, not afterthoughts bolted onto the flow.",
  },
  {
    icon: HeartHandshake,
    title: "People over jargon",
    body: "The product speaks the language of everyday M-Pesa users — short sentences, familiar steps and zero financial theatre.",
  },
  {
    icon: Lightbulb,
    title: "Craft in the details",
    body: "From empty states to error recovery, the small moments get as much attention as the headline features.",
  },
];

export default function AboutPage() {
  return (
    <div>
      <section className="gradient-hero relative overflow-hidden border-b border-border">
        <div className="grid-pattern absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="max-w-2xl space-y-5">
            <p className="text-xs font-bold uppercase tracking-widest text-accent-strong">About us</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-balance text-foreground sm:text-5xl">
              Building the calm way to grow
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Zentra brings account, wallet, investment plan and rewards tools together in one
              straightforward experience.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "About" }]} className="mb-8" />

        <div className="grid gap-6 sm:grid-cols-2">
          <Card className="shadow-xs">
            <CardContent className="space-y-3 p-6">
              <span className="flex size-10 items-center justify-center rounded-md bg-primary/15 text-primary">
                <Compass className="size-5" />
              </span>
              <h2 className="text-lg font-extrabold tracking-tight">Our mission</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                To make investing feel as familiar as sending money on M-Pesa — with clear numbers,
                honest projections and rewards that recognise the people you bring along.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-xs">
            <CardContent className="space-y-3 p-6">
              <span className="flex size-10 items-center justify-center rounded-md bg-secondary text-foreground">
                <Eye className="size-5" />
              </span>
              <h2 className="text-lg font-extrabold tracking-tight">Our story</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Zentra is designed to make account activity, product terms and transaction status
                easier to understand before you make a decision.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="mb-8 space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Values
            </p>
            <h2 className="text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">
              What we optimise for
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {values.map((value) => (
              <Card key={value.title} className="shadow-xs">
                <CardContent className="space-y-3 p-5">
                  <span className="flex size-10 items-center justify-center rounded-md bg-secondary text-foreground">
                    <value.icon className="size-5" />
                  </span>
                  <h3 className="text-base font-extrabold tracking-tight">{value.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{value.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-lg border border-border bg-card p-6 shadow-xs sm:flex-row sm:items-center">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Explore Zentra
              </p>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              Create an account to explore available plans, manage your wallet and contact support.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button asChild variant="outline">
              <Link href="/contact">Contact us</Link>
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

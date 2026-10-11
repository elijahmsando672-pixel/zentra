"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { formatKES } from "@/lib/utils";

const sections = [
  {
    id: "nature",
    title: "The nature of this platform",
    paragraphs: [
      "Zentra provides account, wallet, investment-plan and rewards features. Some displayed records may be sample data. Payment and payout statuses depend on the selected method and provider confirmation.",
      "When live provider credentials are not configured, payment prompts and settlement statuses may be simulated. Read the notice shown in the payment flow before proceeding.",
    ],
  },
  {
    id: "projections",
    title: "Projections are illustrative, not promises",
    paragraphs: [
      "Plan pages show projected earnings and payout amounts based on the rates and durations displayed. These figures are estimates, not forecasts or promises of returns.",
      "Actual outcomes can vary, and you may lose some or all of the amount committed. Past performance is not a reliable indicator of future results.",
    ],
  },
  {
    id: "figures",
    title: "Review figures and records",
    paragraphs: [
      "Check product terms, account balances, reward eligibility and transaction statuses in your account before making decisions.",
      "Where money appears — for example deposits from " +
        formatKES(100, { decimals: 0 }) +
        " or withdrawals capped at " +
        formatKES(100000, { decimals: 0 }) +
        " — the applicable limits are shown in the relevant flow before you confirm.",
    ],
  },
  {
    id: "capital",
    title: "Risk to capital in a real product",
    paragraphs: [
      "Investing carries the risk of losing part or all of the amount committed. The value of an investment can fall as well as rise, and early access to funds may not be possible.",
      "You should never commit money you cannot afford to lose, and you should consider whether the product is suitable for you before participating.",
    ],
  },
  {
    id: "liquidity",
    title: "Liquidity and withdrawal risk",
    paragraphs: [
      "Withdrawals may be subject to account checks, review periods and provider processing. Access may be delayed during reviews, maintenance or service interruptions.",
      "Plan terms may restrict early access to committed funds. Review the terms for each plan before investing.",
    ],
  },
  {
    id: "team",
    title: "Team rewards carry their own risks",
    paragraphs: [
      "Team rewards depend on qualifying activity by other people, which is unpredictable. Ranks and rates may change under the programme rules.",
      "Rewards may be reversed if the underlying transaction fails or is refunded.",
    ],
  },
  {
    id: "operational",
    title: "Operational and technology risk",
    paragraphs: [
      "Online services can experience outages, cyber attacks, software defects and third-party failures that may affect access to your account or data.",
    ],
  },
  {
    id: "security",
    title: "Security responsibilities",
    paragraphs: [
      "Keep your password, transaction PIN and one-time codes confidential. Contact support promptly if you suspect suspicious account activity.",
    ],
  },
  {
    id: "responsibility",
    title: "Your responsibility",
    paragraphs: [
      "Review the product information, terms and transaction details before proceeding. Do not rely on projected figures as guaranteed outcomes.",
      "You are responsible for ensuring that your use of the platform complies with the laws that apply to you.",
    ],
  },
  {
    id: "contact",
    title: "Questions",
    paragraphs: [
      "If anything in this disclosure is unclear, reach out through the contact page or support channels listed there.",
    ],
  },
];

const highlights = [
  {
    title: "Payment status matters",
    body: "Some payment prompts or statuses may be simulated when live provider credentials are unavailable.",
  },
  {
    title: "No guaranteed returns",
    body: "Every projection is an illustrative example, never a promise.",
  },
];

export default function RiskDisclosurePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <PageHeader
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Risk disclosure" }]}
        title="Risk disclosure"
        description="Review the risks associated with investments, payments and account access. Effective 10 October 2026."
      />

      <div className="mt-6 space-y-6">
        <Alert variant="danger">
          <AlertTriangle />
          <AlertTitle>Investment and payment risks</AlertTitle>
          <AlertDescription>
            Investment returns are not guaranteed. Some records and payment statuses may be
            illustrative when a live provider is unavailable; confirm payment status before taking action.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 sm:grid-cols-3">
          {highlights.map((item) => (
            <Card key={item.title} className="shadow-xs">
              <CardContent className="space-y-2 p-4">
                <p className="text-xs font-extrabold uppercase tracking-wider text-foreground">
                  {item.title}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">{item.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <nav aria-label="Table of contents" className="rounded-lg border border-border bg-card p-5 shadow-xs">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <ShieldAlert className="size-3.5" />
            On this page
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {sections.map((section, i) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
                >
                  {i + 1}. {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-6">
          {sections.map((section, i) => (
            <section key={section.id} id={section.id} className="scroll-mt-24 space-y-3">
              <h2 className="text-lg font-extrabold tracking-tight">
                {i + 1}. {section.title}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-relaxed text-muted-foreground">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>

        <div className="flex flex-col items-start justify-between gap-4 rounded-lg border border-border bg-card p-6 shadow-xs sm:flex-row sm:items-center">
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Have a question about a figure you saw? The FAQ explains where every
            number comes from.
          </p>
          <div className="flex shrink-0 gap-2">
            <Button asChild variant="outline">
              <Link href="/terms">Terms</Link>
            </Button>
            <Button asChild>
              <Link href="/faq">
                Read the FAQ
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

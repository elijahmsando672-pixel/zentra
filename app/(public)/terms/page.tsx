"use client";

import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";

const sections = [
  {
    id: "acceptance",
    title: "Acceptance of these terms",
    paragraphs: [
      "These terms govern your use of the Zentra website and application. By creating an account, browsing the product catalogue or otherwise using the platform, you confirm that you have read and agree to them.",
      "If you do not agree with any part of these terms, you should stop using the platform immediately.",
    ],
  },
  {
    id: "service",
    title: "The service",
    paragraphs: [
      "Zentra provides account, wallet, investment-plan, rewards and support features through its website and application. Feature availability may depend on your account status, location and enabled payment methods.",
      "Payment requests and transaction statuses are subject to provider confirmation. A status shown in your account is not proof of an external payment unless the relevant provider has confirmed it.",
    ],
  },
  {
    id: "eligibility",
    title: "Eligibility",
    paragraphs: [
      "You must be at least 18 years old, provide accurate account information and comply with the laws that apply where you use the service.",
    ],
  },
  {
    id: "accounts",
    title: "Your account",
    paragraphs: [
      "You are expected to provide accurate details when registering and to keep your login credentials, transaction PIN and any one-time codes confidential.",
      "You are responsible for activity that occurs through your account. Notify support promptly if you suspect unauthorised access.",
    ],
  },
  {
    id: "products",
    title: "Products, rates and projections",
    paragraphs: [
      "Product pages show the entry amount, duration, rate and projected payout currently configured for each plan.",
      "Projections are estimates, not guaranteed returns. Actual results may differ, and you may lose some or all of the amount committed.",
      "Review the plan terms and displayed figures before making a commitment. Availability and capacity may change.",
    ],
  },
  {
    id: "money",
    title: "Deposits, withdrawals and fees",
    paragraphs: [
      "Payment methods are controlled by operations. M-Pesa deposits are unavailable until a Till number and live provider credentials are configured. When live credentials are absent, prompts may be simulated and do not move real funds; check the payment notice shown before proceeding.",
      "Withdrawal requests may be subject to account checks, approval and provider processing. A request marked as processing is not a completed payout; rely on the final status and provider confirmation.",
      "Applicable limits, fees and processing times are displayed before confirmation and may change. Review them before submitting a request.",
    ],
  },
  {
    id: "rewards",
    title: "Team rewards and ranks",
    paragraphs: [
      "The three-level team structure, rank criteria and commission rates are modelled to show how a referral programme could work.",
      "Rewards, eligibility, volumes, thresholds and rank benefits are governed by the programme rules displayed in your account. Inviting people does not guarantee a reward.",
    ],
  },
  {
    id: "use",
    title: "Acceptable use",
    paragraphs: [
      "You agree not to misuse the platform, interfere with its operation, access another person's account or submit information that is false or misleading.",
    ],
  },
  {
    id: "intellectual",
    title: "Intellectual property",
    paragraphs: [
      "Zentra's name, branding, software and content are protected by applicable intellectual property laws.",
      "Third-party libraries used by the platform remain subject to their own licences.",
    ],
  },
  {
    id: "disclaimers",
    title: "Disclaimers and limitation of liability",
    paragraphs: [
      "The platform is provided on an as-is and as-available basis. No warranties, express or implied, are given about accuracy, availability or fitness for a particular purpose.",
      "To the extent permitted by applicable law, Zentra is not responsible for indirect or consequential loss arising from temporary service interruptions or third-party provider failures.",
    ],
  },
  {
    id: "changes",
    title: "Changes to these terms",
    paragraphs: [
      "These terms may be updated. The revision date shown on this page indicates the latest version.",
      "Continued use of the platform after changes are published constitutes acceptance of the revised terms.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    paragraphs: [
      "Questions about these terms can be sent through the contact page or the support channels listed there.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <PageHeader
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Terms of service" }]}
        title="Terms of service"
        description="Please review these terms before using Zentra. Effective 10 October 2026."
      />

      <div className="mt-6 space-y-6">
        <nav aria-label="Table of contents" className="rounded-lg border border-border bg-card p-5 shadow-xs">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <FileText className="size-3.5" />
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
            Read the risk disclosure for information about investment and payment risks.
          </p>
          <Button asChild variant="outline" className="shrink-0">
            <Link href="/risk-disclosure">
              Risk disclosure
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

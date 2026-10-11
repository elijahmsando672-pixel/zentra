"use client";

import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";

const sections = [
  {
    id: "scope",
    title: "What this notice covers",
    paragraphs: [
      "This notice explains how Zentra handles information when you use its public pages and account dashboard.",
      "It should be read together with the terms of service and the risk disclosure.",
    ],
  },
  {
    id: "service",
    title: "How the service handles information",
    paragraphs: [
      "Account, profile and support information you submit is sent to Zentra's server and stored to operate your account and respond to requests. Some records may be sample data. Payment and identity verification providers may not be connected for every method.",
      "Authentication uses server-side password checks and session cookies. Only submit information needed to use the service, and keep your credentials confidential.",
    ],
  },
  {
    id: "collection",
    title: "Information we handle",
    paragraphs: [
      "Information may include contact details, profile information, sign-in and security events, support messages, and requests you make in the dashboard.",
      "Information submitted through registration, profile and support forms is stored by the service. Some displayed records may be sample records.",
    ],
  },
  {
    id: "use",
    title: "How information would be used",
    paragraphs: [
      "Information is used to create and maintain your account, respond to support requests, protect account access and process requests you submit. Payment and identity checks are completed only where the relevant provider integration is available.",
    ],
  },
  {
    id: "storage",
    title: "Cookies and local storage",
    paragraphs: [
      "The site may use browser storage to remember interface preferences such as your light or dark theme choice.",
      "The site does not intentionally use advertising or cross-site tracking cookies.",
    ],
  },
  {
    id: "sharing",
    title: "Sharing and disclosure",
    paragraphs: [
      "Information may be shared with service providers needed to operate the site, including payment or identity verification providers where those integrations are enabled, and where disclosure is required by law.",
    ],
  },
  {
    id: "retention",
    title: "Retention",
    paragraphs: [
      "Account and support records are stored in the backend database. Contact Zentra through the support channel listed on the site to ask about a record.",
      "Records are retained for as long as needed to provide the service and satisfy applicable record-keeping requirements.",
    ],
  },
  {
    id: "security",
    title: "Security",
    paragraphs: [
      "The application uses password hashing and server-side sessions for sign-in. One-time code delivery and payment processing depend on the integrations available for your account and selected method.",
    ],
  },
  {
    id: "rights",
    title: "Your rights",
    paragraphs: [
      "Applicable data protection laws may give you rights to access, correct or delete personal data and to object to certain processing.",
      "If you submitted account or support information and want to ask about it, contact Zentra through the contact details on this site.",
    ],
  },
  {
    id: "children",
    title: "Children",
    paragraphs: [
      "The service is not directed at children under the age of 18.",
    ],
  },
  {
    id: "changes",
    title: "Changes to this notice",
    paragraphs: [
      "This notice may be updated. The revision date in the page header indicates the current version.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    paragraphs: [
      "Questions about privacy can be raised through the contact page or the support channels listed there.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <PageHeader
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Privacy policy" }]}
        title="Privacy policy"
        description="How Zentra handles account and support information. Effective 10 October 2026."
      />

      <div className="mt-6 space-y-6">
        <nav aria-label="Table of contents" className="rounded-lg border border-border bg-card p-5 shadow-xs">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Lock className="size-3.5" />
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

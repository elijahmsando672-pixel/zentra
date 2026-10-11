"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Check, CheckCircle2, FileText, Info, Smartphone, Upload } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/page-header";
import { CardSkeleton, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { useApiQuery } from "@/hooks/use-api";
import { getProfile, uploadVerificationDocument } from "@/lib/services/profile";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import type { KYCStatus, VerificationStatus } from "@/lib/types";

const KYC_META: Record<KYCStatus, { label: string; tone: string }> = {
  not_started: { label: "Not started", tone: "neutral" },
  pending: { label: "Under review", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
};

const VERIFICATION_META: Record<VerificationStatus, { label: string; tone: string }> = {
  unverified: { label: "Unverified", tone: "neutral" },
  pending: { label: "Pending review", tone: "warning" },
  verified: { label: "Verified", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
};

const KYC_COPY: Record<KYCStatus, string> = {
  not_started: "Upload your documents to start identity verification. Verification unlocks higher limits and faster withdrawals.",
  pending: "Your verification request is pending review. Check your account for status updates.",
  approved: "Your identity is verified. You have full access to every product and limit tier.",
  rejected: "Your last submission could not be accepted. Upload a clearer document to try again.",
};

type DocKind = "id" | "selfie" | "proof";

const DOC_LABELS: Record<DocKind, { title: string; description: string }> = {
  id: {
    title: "National ID or passport",
    description: "A clear photo of the main page — all four corners visible.",
  },
  selfie: {
    title: "Selfie check",
    description: "A recent selfie holding your ID next to your face.",
  },
  proof: {
    title: "Proof of address",
    description: "A utility bill or bank statement from the last 3 months.",
  },
};

export default function VerificationPage() {
  const profile = useApiQuery(["profile", "me"], getProfile);

  const [uploads, setUploads] = React.useState<Record<DocKind, { loading: boolean; hint?: string }>>({
    id: { loading: false },
    selfie: { loading: false },
    proof: { loading: false },
  });

  const handleUpload = async (kind: DocKind, file?: File) => {
    if (!file) return;
    setUploads((prev) => ({ ...prev, [kind]: { loading: true } }));
    const res = await uploadVerificationDocument(kind);
    if (!res.ok) {
      setUploads((prev) => ({ ...prev, [kind]: { loading: false } }));
      toast.error(res.message);
      return;
    }
    setUploads((prev) => ({ ...prev, [kind]: { loading: false, hint: res.data.maskedHint } }));
    toast.success("Document submitted", { description: res.data.maskedHint });
  };

  const u = profile.data;

  if (profile.isPending) {
    return (
      <div className="space-y-6 animate-fade-up">
        <PageHeader title="Verification" breadcrumbs={[{ label: "Profile", href: "/profile" }, { label: "Verification" }]} />
        <CardSkeleton lines={5} />
      </div>
    );
  }

  if (profile.isError || !u) {
    return (
      <div className="space-y-6 animate-fade-up">
        <PageHeader title="Verification" breadcrumbs={[{ label: "Profile", href: "/profile" }, { label: "Verification" }]} />
        <ErrorState title="Could not load verification status" description={profile.error?.message} onRetry={() => void profile.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Verification"
        description="Complete KYC checks to lift limits and protect your account."
        breadcrumbs={[{ label: "Profile", href: "/profile" }, { label: "Verification" }]}
        actions={
          <Button asChild variant="outline">
            <Link href="/profile/security">
              Security centre <ArrowRight />
            </Link>
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="gradient-navy grid-pattern relative">
          <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="space-y-2">
              <p className="text-[11px] font-bold tracking-widest text-white/70 uppercase">Identity verification</p>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={u.kycStatus} meta={KYC_META[u.kycStatus]} />
                <StatusBadge status={u.verificationStatus} meta={VERIFICATION_META[u.verificationStatus]} />
                <Badge variant={u.phoneVerified ? "success" : "outline"}>
                  {u.phoneVerified ? "Phone verified" : "Phone unverified"}
                </Badge>
                <Badge variant={u.emailVerified ? "success" : "outline"}>
                  {u.emailVerified ? "Email verified" : "Email unverified"}
                </Badge>
              </div>
              <p className="max-w-2xl text-sm leading-relaxed text-white/80">{KYC_COPY[u.kycStatus]}</p>
            </div>
            <div className="rounded-lg border border-white/15 px-4 py-3 text-white sm:text-right">
              <p className="text-[11px] font-bold text-white/70 uppercase">Account</p>
              <p className="numeric text-sm font-bold">{u.accountNumber}</p>
              <p className="mt-1 text-[11px] text-white/70">Joined {formatDateTime(u.joinedAt)}</p>
            </div>
          </div>
        </div>
      </Card>

      <Alert variant="warning">
        <Info />
        <AlertTitle>Document submission unavailable</AlertTitle>
        <AlertDescription>
          Documents are not uploaded from this page. Selecting a file does not submit it or start a review. Contact support for the current secure submission process.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Verification steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-xs">
              <span
                className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${
                  u.phoneVerified ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"
                }`}
                aria-hidden
              >
                {u.phoneVerified ? <Check className="size-4" /> : <Smartphone className="size-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold">Phone number verified</p>
                  <Badge variant={u.phoneVerified ? "success" : "outline"}>
                    {u.phoneVerified ? "Done" : "Pending"}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{u.phone}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-xs">
              <span
                className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${
                  u.emailVerified ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"
                }`}
                aria-hidden
              >
                {u.emailVerified ? <Check className="size-4" /> : <FileText className="size-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold">Email address verified</p>
                  <Badge variant={u.emailVerified ? "success" : "outline"}>
                    {u.emailVerified ? "Done" : "Pending"}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{u.email}</p>
              </div>
            </div>

            {(["id", "selfie", "proof"] as const).map((kind) => {
              const state = uploads[kind];
              return (
                <div key={kind} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-xs">
                  <span
                    className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${
                      state.hint ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"
                    }`}
                    aria-hidden
                  >
                    {state.hint ? <Check className="size-4" /> : <Upload className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold">{DOC_LABELS[kind].title}</p>
                      <div className="flex items-center gap-2">
                        {u.kycStatus === "pending" && !state.hint && (
                          <Badge variant="warning">In review</Badge>
                        )}
                        {state.hint && <Badge variant="success">Submitted</Badge>}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{DOC_LABELS[kind].description}</p>
                    {state.hint && <p className="text-xs font-semibold text-success">{state.hint}</p>}
                    <div>
                      <input
                        id={`upload-${kind}`}
                        type="file"
                        accept="image/*,application/pdf"
                        className="sr-only"
                        disabled={state.loading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          void handleUpload(kind, file);
                        }}
                      />
                      <Button asChild variant="outline" size="sm" disabled={state.loading}>
                        <label htmlFor={`upload-${kind}`} className="cursor-pointer">
                          {state.loading ? "Submitting…" : state.hint ? "Replace file" : `Upload ${kind === "id" ? "ID" : kind === "selfie" ? "selfie" : "document"}`}
                        </label>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                {[
                  "Government-issued ID in good condition",
                  "Active Kenyan phone number on this account",
                  "Selfie clearly showing your face and ID",
                  "Proof of address dated within 3 months",
                  "Name on documents matches your profile",
                ].map((req) => (
                  <li key={req} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                    <span className="text-muted-foreground">{req}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">What happens next</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>1. Submit your documents through the secure channel provided by support.</p>
              <Separator />
              <p>2. You get a notification the moment your status changes.</p>
              <Separator />
              <p>3. Once approved, withdrawal limits increase and reviews are skipped for future requests.</p>
              <Button asChild className="mt-2 w-full" variant="outline">
                <Link href="/support">
                  Question about verification? Contact support <ArrowRight />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

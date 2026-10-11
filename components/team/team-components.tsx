"use client";

import * as React from "react";
import { Check, Copy, MessageCircle, Share2, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CopyButton } from "@/components/shared/copy-button";
import { cn, copyText, initials, formatDate, formatKES, maskPhone } from "@/lib/utils";
import { RANK_META } from "@/lib/constants";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import type { RankKey, TeamMember } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Decorative QR-style graphic                                         */
/* ------------------------------------------------------------------ */

export function QrCodeGraphic({
  value,
  size = 168,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const cells = 21;
  // Deterministic hash → matrix
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  const matrix: boolean[][] = [];
  let seed = hash || 12345;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let r = 0; r < cells; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < cells; c++) row.push(rand() > 0.52);
    matrix.push(row);
  }
  // Finder patterns (corners)
  const drawFinder = (row: number, col: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const edge = r === 0 || r === 6 || c === 0 || c === 6;
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        matrix[row + r][col + c] = edge || core;
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, cells - 7);
  drawFinder(cells - 7, 0);

  const cellSize = size / cells;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={cn("rounded-md bg-white p-1", className)}
      role="img"
      aria-label={`QR code for ${value}`}
    >
      {matrix.map((row, r) =>
        row.map((on, c) =>
          on ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#071426"
            />
          ) : null
        )
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Referral link card                                                  */
/* ------------------------------------------------------------------ */

export function ReferralLinkCard({
  code,
  url,
  className,
}: {
  code: string;
  url: string;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="gradient-navy relative px-5 py-5 text-white">
        <div className="grid-pattern absolute inset-0 opacity-50" aria-hidden />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-widest text-white/60 uppercase">Your invite code</p>
            <p className="numeric mt-1 text-2xl font-extrabold tracking-[0.2em]">{code}</p>
          </div>
          <div className="flex gap-2">
            <CopyButton
              value={code}
              label="Copy code"
              size="default"
              variant="secondary"
              className="bg-white/10 text-white border-white/15 hover:bg-white/20"
            />
          </div>
        </div>
      </div>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Invite link</p>
          <ShareInviteDialog url={url} code={code} />
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2.5">
          <p className="numeric min-w-0 flex-1 truncate text-xs text-muted-foreground">{url}</p>
          <CopyButton value={url} />
        </div>
      </CardContent>
    </Card>
  );
}

export function ShareInviteDialog({ url, code }: { url: string; code: string }) {
  const message = `Join me on Zentra — build your next level. Use my invite code ${code}: ${url}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(message)}`;
  const sms = `sms:?&body=${encodeURIComponent(message)}`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <Share2 /> Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share your invite</DialogTitle>
          <DialogDescription>
            Copy your invite link and send it to friends and family using your preferred app.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center py-2">
          <QrCodeGraphic value={url} size={180} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline">
            <a href={wa} target="_blank" rel="noreferrer">
              <MessageCircle /> WhatsApp
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={sms}>
              <Smartphone /> SMS
            </a>
          </Button>
        </div>
        <Button
          variant="secondary"
          onClick={async () => {
            if (typeof navigator !== "undefined" && navigator.share) {
              try {
                await navigator.share({ title: "Join me on Zentra", text: message });
              } catch {
                /* cancelled */
              }
            } else {
              await copyText(message);
              toast.success("Invite message copied");
            }
          }}
        >
          <Copy /> Copy invite message
        </Button>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Team member card                                                    */
/* ------------------------------------------------------------------ */

export function TeamMemberCard({ member, className }: { member: TeamMember; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3.5 rounded-lg border border-border bg-card p-3.5 shadow-xs",
        className
      )}
    >
      <Avatar className="size-11">
        <AvatarFallback className="bg-brand-navy text-sm text-white">
          {initials(member.fullName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-bold">{member.fullName}</p>
          <Badge variant="outline" className="shrink-0 text-[10px]">
            L{member.level}
          </Badge>
          {member.active ? (
            <span className="size-1.5 shrink-0 rounded-full bg-success" title="Active" />
          ) : (
            <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/50" title="Inactive" />
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Joined {formatDate(member.joinedAt)} · {member.maskedPhone}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="numeric text-sm font-extrabold">{formatKES(member.rewardContribution, { decimals: 0 })}</p>
        <p className="text-[10px] text-muted-foreground">reward contribution</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rank progress                                                       */
/* ------------------------------------------------------------------ */

export function RankBadge({ rank, className }: { rank: RankKey; className?: string }) {
  const meta = RANK_META[rank];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold",
        className
      )}
      style={{ backgroundColor: `${meta.accent}22`, color: meta.accent }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: meta.accent }} />
      {meta.label}
    </span>
  );
}

export function RankProgressCard({
  currentRank,
  nextRank,
  progress,
  criteria,
  className,
}: {
  currentRank: RankKey;
  nextRank?: RankKey;
  progress: number;
  criteria: { label: string; current: number; required: number }[];
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Rank progress</span>
          <RankBadge rank={currentRank} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {nextRank ? `Toward ${RANK_META[nextRank].label}` : "Top rank achieved"}
            </span>
            <span className="numeric font-bold">{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
        <ul className="space-y-2.5">
          {criteria.map((c) => {
            const pct = c.required > 0 ? Math.min(100, (c.current / c.required) * 100) : 100;
            return (
              <li key={c.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{c.label}</span>
                  <span className="numeric font-bold">
                    {c.current.toLocaleString()} / {c.required.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

export function CommissionBreakdownCard({
  levels,
  className,
}: {
  levels: { level: 1 | 2 | 3; label: string; members: number; volume: number; rewards: number; ratePercent: number }[];
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-3", className)}>
      {levels.map((l) => (
        <div key={l.level} className="rounded-lg border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <Badge variant="secondary">Level {l.level}</Badge>
            <span className="numeric text-xs font-bold text-success">{l.ratePercent}%</span>
          </div>
          <p className="numeric mt-3 text-xl font-extrabold">{formatKES(l.rewards, { decimals: 0 })}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{l.members} members · {l.label}</p>
          <p className="numeric mt-2 text-xs text-muted-foreground">
            Volume {formatKES(l.volume, { decimals: 0 })}
          </p>
        </div>
      ))}
    </div>
  );
}

export { Check };

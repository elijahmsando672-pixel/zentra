"use client";

import { useState } from "react";
import { Coins, Gift, Percent, Sparkles, Ticket, TicketCheck, Trophy } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { CardSkeleton, EmptyState, ErrorState, SuccessState } from "@/components/shared/states";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiQuery } from "@/hooks/use-api";
import {
  claimBonus,
  getBonuses,
  getCampaigns,
  getCoupons,
  redeemCoupon,
} from "@/lib/services/rewards";
import { WALLET_META } from "@/lib/constants";
import { formatKES, formatShortDate, relativeTime } from "@/lib/utils";
import type { Campaign, RewardStatus } from "@/lib/types";

const REWARD_META: Record<RewardStatus, { label: string; tone: string }> = {
  available: { label: "Available", tone: "success" },
  claimed: { label: "Claimed", tone: "neutral" },
  expired: { label: "Expired", tone: "danger" },
  pending: { label: "Pending", tone: "warning" },
  reversed: { label: "Reversed", tone: "danger" },
};

const CAMPAIGN_META: Record<Campaign["status"], { label: string; tone: string }> = {
  scheduled: { label: "Scheduled", tone: "info" },
  active: { label: "Active", tone: "success" },
  ended: { label: "Ended", tone: "neutral" },
  draft: { label: "Draft", tone: "neutral" },
};

export default function RewardsPage() {
  const bonuses = useApiQuery(["bonuses"], getBonuses);
  const coupons = useApiQuery(["coupons"], getCoupons);
  const campaigns = useApiQuery(["campaigns"], getCampaigns);

  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState("");
  const [redeemed, setRedeemed] = useState<{ message: string } | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const totalEarned =
    bonuses.data?.filter((b) => b.status === "claimed").reduce((s, b) => s + b.amount, 0) ?? 0;
  const pendingClaims =
    bonuses.data?.filter((b) => b.status === "pending").length ?? 0;
  const couponsAvailable =
    coupons.data?.filter((c) => c.active && new Date(c.expiresAt) > new Date()).length ?? 0;

  const handleClaim = async (id: string) => {
    setClaimingId(id);
    const res = await claimBonus(id);
    setClaimingId(null);
    if (res.ok) {
      toast.success("Bonus claimed");
      void bonuses.refetch();
    } else {
      toast.error(res.message);
    }
  };

  const handleRedeem = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setRedeemError("Enter a coupon code.");
      return;
    }
    setRedeeming(true);
    setRedeemError("");
    setRedeemed(null);
    const res = await redeemCoupon(trimmed);
    setRedeeming(false);
    if (res.ok) {
      setRedeemed({ message: res.data.message });
      setCode("");
      void bonuses.refetch();
      void coupons.refetch();
      toast.success("Coupon redeemed");
    } else {
      setRedeemError(res.fieldErrors?.code ?? res.message);
      toast.error(res.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rewards"
        description="Your team bonuses, coupon redemptions and active campaigns — all credited to your wallets."
        actions={<DemoDataBadge />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total bonuses earned"
          value={bonuses.isLoading ? undefined : <>{formatKES(totalEarned)}</>}
          icon={<Coins className="size-5" />}
          loading={bonuses.isLoading}
          supporting="Claimed bonuses"
        />
        <StatCard
          label="Pending claims"
          value={bonuses.isLoading ? undefined : pendingClaims}
          icon={<Gift className="size-5" />}
          loading={bonuses.isLoading}
          supporting="Ready to claim"
        />
        <StatCard
          label="Coupons available"
          value={coupons.isLoading ? undefined : couponsAvailable}
          icon={<Ticket className="size-5" />}
          loading={coupons.isLoading}
          supporting="Active & valid"
        />
      </div>

      <Tabs defaultValue="bonuses">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="bonuses">Bonuses</TabsTrigger>
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
        </TabsList>

        <TabsContent value="bonuses" className="mt-5">
          {bonuses.isLoading ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <CardSkeleton lines={3} />
              <CardSkeleton lines={3} />
            </div>
          ) : bonuses.error ? (
            <ErrorState
              title="Could not load bonuses"
              description={bonuses.error.message}
              onRetry={() => void bonuses.refetch()}
            />
          ) : bonuses.data && bonuses.data.length > 0 ? (
            <div className="space-y-3">
              {bonuses.data.map((bonus) => (
                <Card key={bonus.id}>
                  <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                    <span
                      className={`flex size-11 shrink-0 items-center justify-center rounded-md ${
                        bonus.status === "pending"
                          ? "bg-warning-soft text-warning"
                          : bonus.status === "claimed"
                            ? "bg-success-soft text-success"
                            : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      <Gift className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-extrabold">{bonus.title}</p>
                        <StatusBadge status={bonus.status} meta={REWARD_META[bonus.status]} />
                      </div>
                      <p className="text-xs text-muted-foreground">{bonus.description}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                        <span>{relativeTime(bonus.awardedAt)}</span>
                        <span>·</span>
                        <span>{WALLET_META[bonus.wallet].label}</span>
                        <span>·</span>
                        <span className="numeric">{bonus.reference}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <p className="numeric text-lg font-extrabold">{formatKES(bonus.amount)}</p>
                      {bonus.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => void handleClaim(bonus.id)}
                          disabled={claimingId === bonus.id}
                        >
                          {claimingId === bonus.id ? "Claiming…" : "Claim"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Gift />}
              title="No bonuses yet"
              description="Bonuses from campaigns and coupon redemptions will appear here."
            />
          )}
        </TabsContent>

        <TabsContent value="coupons" className="mt-5 space-y-5">
          <Card>
            <CardContent className="p-5">
              <div className="space-y-2">
                <Label htmlFor="coupon-code">Redeem a coupon code</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="coupon-code"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      setRedeemError("");
                      setRedeemed(null);
                    }}
                    placeholder="e.g. ZENTRA-100"
                    className="uppercase sm:max-w-xs"
                    aria-invalid={!!redeemError}
                  />
                  <Button onClick={() => void handleRedeem()} disabled={redeeming} className="sm:w-auto">
                    <TicketCheck />
                    {redeeming ? "Redeeming…" : "Redeem"}
                  </Button>
                </div>
                {redeemError && (
                  <p role="alert" className="text-xs font-semibold text-danger">
                    {redeemError}
                  </p>
                )}
              </div>
              {redeemed && (
                <div className="mt-4">
                  <SuccessState
                    title="Coupon redeemed"
                    description={redeemed.message}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {coupons.isLoading ? (
            <CardSkeleton lines={4} />
          ) : coupons.error ? (
            <ErrorState
              title="Could not load coupons"
              description={coupons.error.message}
              onRetry={() => void coupons.refetch()}
            />
          ) : coupons.data && coupons.data.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {coupons.data.map((coupon) => (
                <Card key={coupon.id}>
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-md bg-gold-soft text-gold">
                          <Percent className="size-4" />
                        </span>
                        <div>
                          <p className="text-sm font-extrabold">{coupon.code}</p>
                          <p className="text-xs text-muted-foreground">{coupon.title}</p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={coupon.active ? "border-transparent bg-success-soft text-success" : "border-transparent bg-muted text-muted-foreground"}
                      >
                        {coupon.active ? "Valid" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{coupon.description}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span className="numeric font-bold text-foreground">
                        Worth {formatKES(coupon.value)}
                      </span>
                      <span>Expires {formatShortDate(coupon.expiresAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Ticket />}
              title="No coupons right now"
              description="Coupon codes you are eligible for will be listed here."
            />
          )}
        </TabsContent>

        <TabsContent value="campaigns" className="mt-5">
          {campaigns.isLoading ? (
            <CardSkeleton lines={4} />
          ) : campaigns.error ? (
            <ErrorState
              title="Could not load campaigns"
              description={campaigns.error.message}
              onRetry={() => void campaigns.refetch()}
            />
          ) : campaigns.data && campaigns.data.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {campaigns.data.map((campaign) => {
                const pct =
                  campaign.budget > 0 ? Math.min(100, (campaign.spent / campaign.budget) * 100) : 0;
                return (
                  <Card key={campaign.id}>
                    <CardContent className="space-y-3 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="flex size-10 items-center justify-center rounded-md bg-info-soft text-info">
                            <Trophy className="size-4" />
                          </span>
                          <div>
                            <p className="text-sm font-extrabold">{campaign.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {formatShortDate(campaign.startsAt)} – {formatShortDate(campaign.endsAt)}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={campaign.status} meta={CAMPAIGN_META[campaign.status]} />
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{campaign.description}</p>
                      <p className="text-[11px] font-semibold text-muted-foreground">
                        Audience: {campaign.audience}
                      </p>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Budget spent</span>
                          <span className="numeric font-bold text-foreground">
                            {formatKES(campaign.spent)} of {formatKES(campaign.budget)}
                          </span>
                        </div>
                        <Progress value={pct} indicatorClassName="bg-gold" />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        <span className="numeric font-bold text-foreground">{campaign.awardsIssued}</span>{" "}
                        awards issued
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<Sparkles />}
              title="No campaigns"
              description="You will see campaigns when your ranks open up eligibility."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
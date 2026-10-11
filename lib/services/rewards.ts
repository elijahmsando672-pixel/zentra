import { bumpApiVersion } from "@/hooks/use-api";
import { apiRequest } from "@/lib/services/helpers";
import type { ApiResponse, BonusAward, Campaign, Coupon } from "@/lib/types";

export async function getBonuses(): Promise<ApiResponse<BonusAward[]>> {
  return apiRequest<BonusAward[]>("/api/rewards/bonuses");
}

export async function getCoupons(): Promise<ApiResponse<Coupon[]>> {
  return apiRequest<Coupon[]>("/api/rewards/coupons");
}

export async function getCampaigns(): Promise<ApiResponse<Campaign[]>> {
  return apiRequest<Campaign[]>("/api/rewards/campaigns");
}

export async function redeemCoupon(code: string): Promise<ApiResponse<{ bonus: BonusAward; message: string }>> {
  const res = await apiRequest<{ bonus: BonusAward; message: string }>("/api/rewards/redeem", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  if (res.ok) bumpApiVersion();
  return res;
}

export async function claimBonus(id: string): Promise<ApiResponse<{ done: true }>> {
  const res = await apiRequest<{ done: true }>(`/api/rewards/bonuses/${id}/claim`, { method: "POST" });
  if (res.ok) bumpApiVersion();
  return res;
}

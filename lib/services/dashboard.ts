import { apiRequest } from "@/lib/services/helpers";
import type { ApiResponse, PageStats, PortfolioPoint } from "@/lib/types";

export interface DashboardSummary {
  user: { fullName: string; accountNumber: string; rank: string; profileCompletion: number; verificationStatus: string };
  totalAvailable: number;
  totalInvested: number;
  todayEarnings: number;
  totalEarnings: number;
  teamRewardsTotal: number;
  pendingWithdrawal: number;
  activeProducts: number;
  portfolioSeries: PortfolioPoint[];
  walletBreakdown: { wallet: string; label: string; balance: number; hue: string }[];
  recentActivity: {
    id: string;
    type: string;
    description: string;
    amount: number;
    direction: "incoming" | "outgoing";
    status: string;
    at: string;
  }[];
  growthPercent30d: number;
}

export async function getDashboardSummary(): Promise<ApiResponse<DashboardSummary>> {
  return apiRequest<DashboardSummary>("/api/dashboard");
}

export async function getMarketingStats(): Promise<ApiResponse<PageStats>> {
  return apiRequest<PageStats>("/api/marketing/stats");
}

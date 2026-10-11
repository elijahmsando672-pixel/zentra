import { apiRequest, simulateNetwork, toQuery } from "@/lib/services/helpers";
import { DEMO_DOMAIN } from "@/lib/constants";
import type {
  ApiResponse,
  CommissionRule,
  ReferralActivity,
  TeamMember,
  TeamReward,
  TeamSummary,
} from "@/lib/types";

export async function getTeamSummary(): Promise<ApiResponse<TeamSummary>> {
  return apiRequest<TeamSummary>("/api/team/summary");
}

export async function getTeamMembers(level?: 1 | 2 | 3): Promise<ApiResponse<TeamMember[]>> {
  return apiRequest<TeamMember[]>(`/api/team/members${toQuery({ level })}`);
}

export async function getTeamRewards(filter?: {
  level?: 1 | 2 | 3;
  status?: string;
}): Promise<ApiResponse<TeamReward[]>> {
  return apiRequest<TeamReward[]>(
    `/api/team/rewards${toQuery({ level: filter?.level, status: filter?.status })}`
  );
}

export async function getReferralActivity(): Promise<ApiResponse<ReferralActivity[]>> {
  return apiRequest<ReferralActivity[]>("/api/team/activity");
}

export async function getCommissionRules(): Promise<ApiResponse<CommissionRule[]>> {
  return apiRequest<CommissionRule[]>("/api/team/commission-rules");
}

export async function copyInviteLink(code: string): Promise<ApiResponse<{ url: string }>> {
  return simulateNetwork({ url: `https://${DEMO_DOMAIN}/register?inviteCode=${code}` }, 200);
}

export async function validateInviteCode(code: string): Promise<ApiResponse<{ sponsorName: string }>> {
  return apiRequest<{ sponsorName: string }>(`/api/team/validate-invite${toQuery({ code })}`);
}

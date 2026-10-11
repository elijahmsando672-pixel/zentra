import { bumpApiVersion } from "@/hooks/use-api";
import { apiRequest, toQuery } from "@/lib/services/helpers";
import type { AdminDashboardSummary, AdminStaff, ApiResponse, AuditLog, Campaign, Coupon, Deposit, Investment, LedgerJournal, Paginated, Product, RiskFlag, User, Withdrawal, TeamMember, TeamReward, CommissionRule, ReferralActivity } from "@/lib/types";

const get = <T,>(resource: string, params: Record<string, unknown> = {}) => apiRequest<T>(`/api/admin/${resource}${toQuery(params)}`);
const post = async <T,>(resource: string, body: unknown): Promise<ApiResponse<T>> => {
  const result = await apiRequest<T>(`/api/admin/${resource}`, { method: "POST", body: JSON.stringify(body) });
  if (result.ok) bumpApiVersion();
  return result;
};

export const getAdminDashboard = () => get<AdminDashboardSummary & Record<string, unknown>>("dashboard");
export const getAdminUsers = (filter?: {search?:string;status?:string;risk?:string;page?:number}) => get<Paginated<User>>("users",filter);
export const getAdminUserById = (id:string) => get<User>(`users/${encodeURIComponent(id)}`);
export const adminUserAction = (userId:string,action:"freeze"|"restrict_withdrawals"|"restrict_deposits"|"restrict_referrals"|"unfreeze"|"clear_flags",reason:string) => post<{done:true}>(`users/${encodeURIComponent(userId)}`,{action,reason});
export const getAdminWithdrawals = (filter?:{status?:string;risk?:string;search?:string;page?:number;pageSize?:number}) => get<Paginated<Withdrawal>>("withdrawals",filter);
export const reviewWithdrawal = (id:string,decision:"approve"|"reject",reason?:string) => post<{done:true}>(`withdrawals/${encodeURIComponent(id)}`,{decision,reason});
export const getAdminDeposits = (filter?:{status?:string;search?:string;page?:number;pageSize?:number}) => get<Paginated<Deposit>>("deposits",filter);
export const markDepositReviewed = (id:string,note:string) => post<{done:true}>(`deposits/${encodeURIComponent(id)}`,{reason:note});
export const reviewDepositPayment = (id:string,decision:"confirm"|"reject",note:string) => post<{done:true}>(`deposits/${encodeURIComponent(id)}`,{action:decision,reason:note});
export const getAdminInvestments = (filter?:{search?:string}) => get<Investment[]>("investments",filter);
export const getLedger = (filter?:{search?:string;type?:string;page?:number}) => get<Paginated<LedgerJournal>>("ledger",filter);
export const getLedgerById = (id:string) => get<LedgerJournal>(`ledger/${encodeURIComponent(id)}`);
export const getRiskFlags = (filter?:{status?:string;level?:string}) => get<RiskFlag[]>("risk",filter);
export const updateRiskFlag = (id:string,status:RiskFlag["status"],resolution?:string) => post<{done:true}>(`risk/${encodeURIComponent(id)}`,{status,reason:resolution});
export const getAdminStaff = () => get<AdminStaff[]>("staff");
export const getAuditLogs = (filter?:{search?:string;action?:string;page?:number}) => get<Paginated<AuditLog>>("audit",filter);
export const getAdminCoupons = () => get<Coupon[]>("coupons");
export const createCoupon = (input:{code:string;title:string;description:string;value:number;type:Coupon["type"];maxRedemption?:number;expiresAt?:string}) => post<Coupon>("coupons",input);
export const setCouponActive = (id:string,active:boolean) => post<Coupon>(`coupons/${encodeURIComponent(id)}`,{active});
export interface AdminSystemSettings {
  maintenanceMode: boolean; registrationsOpen: boolean; depositsEnabled: boolean; withdrawalsEnabled: boolean;
  referralRewardsEnabled: boolean; maxWithdrawalLimit: number; minDeposit: number; supportSlaHours: number;
  contact: {
    adminName: string;
    adminEmail: string;
    whatsappNumber: string;
    mpesaTillNumber: string;
    /** @deprecated Read only to migrate older saved settings. */
    mpesaNumber?: string;
  };
  payments: { mpesa: boolean; paypal: boolean };
  featureFlags: { newProductCatalogue: boolean; darkModeForMembers: boolean; betaCharts: boolean; instantPayouts: boolean };
}
export const getSystemSettings = () => get<AdminSystemSettings>("settings");
export const saveSystemSettings = (settings: Partial<AdminSystemSettings>) => post<AdminSystemSettings>("settings",settings);
export const getAdminTeamMembers = () => get<TeamMember[]>("team-members");
export const getAdminTeamRewards = () => get<TeamReward[]>("team-rewards");
export const getAdminCommissionRules = () => get<CommissionRule[]>("commission-rules");
export const getAdminReferralActivity = () => get<ReferralActivity[]>("referral-activity");
export const updateCampaignStatus = (id:string,status:Campaign["status"]) => post<Campaign>(`campaigns/${encodeURIComponent(id)}`,{status});
export const getAdminCampaigns = () => get<Campaign[]>("campaigns");
export const updateProductStatus = (id:string,status:Product["status"]) => post<Product>(`products/${encodeURIComponent(id)}`,{status});
export const updateCommissionRule = (id:string,percent:number,active:boolean) => post<CommissionRule>(`commission-rules/${encodeURIComponent(id)}`,{percent,active});
export const adminStaffAction = (id:string,action:"activate"|"suspend"|"revoke_sessions") => post<{done:true}>(`staff/${encodeURIComponent(id)}`,{action});
export interface ReconciliationReview { id:string; dayKey:string; reviewer:string; reviewedAt:string }
export const getReconciliationReviews = () => get<ReconciliationReview[]>("reconciliation");
export const markReconciliationReviewed = (dayKey:string) => post<ReconciliationReview>("reconciliation",{dayKey});

/* ------------------------------------------------------------------ */
/* Zentra domain types shared by the API and interface.                */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

export type ID = string;

export type TransactionType =
  | "deposit"
  | "withdrawal"
  | "investment"
  | "earning"
  | "team_reward"
  | "bonus"
  | "adjustment"
  | "transfer";

export type TransactionStatus =
  | "pending"
  | "processing"
  | "successful"
  | "failed"
  | "cancelled"
  | "rejected"
  | "on_hold";

export type WalletType =
  | "deposit"
  | "investment"
  | "earnings"
  | "team_rewards"
  | "bonus"
  | "pending_withdrawal"
  | "locked";

export type ProductTier = "starter" | "growth" | "elite";
export type ProductStatus = "active" | "paused" | "sold_out" | "retired" | "draft";
export type InvestmentStatus = "active" | "maturing" | "completed" | "cancelled";
export type EarningStatus = "scheduled" | "credited" | "skipped";
export type DepositStatus = "initiated" | "pending" | "completed" | "failed" | "cancelled";
export type PaymentMethod = "mpesa" | "paypal";
export type WithdrawalStatus =
  | "pending_approval"
  | "approved"
  | "processing"
  | "paid"
  | "rejected"
  | "cancelled"
  | "failed";

export type RankKey = "member" | "bronze" | "silver" | "gold" | "platinum" | "diamond";
export type NotificationCategory =
  | "transaction"
  | "team"
  | "account"
  | "support"
  | "promotional"
  | "security";

export type TicketStatus = "open" | "in_progress" | "waiting_on_you" | "resolved" | "closed";
export type TicketPriority = "low" | "normal" | "high";
export type RiskLevel = "low" | "medium" | "high";
export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";
export type KYCStatus = "not_started" | "pending" | "approved" | "rejected";
export type RewardStatus = "available" | "claimed" | "expired" | "pending" | "reversed";
export type Role = "user" | "agent" | "analyst" | "finance" | "admin" | "super_admin";

/* ------------------------------------------------------------------ */
/* Identity                                                            */
/* ------------------------------------------------------------------ */

export interface User {
  id: ID;
  accountNumber: string;
  fullName: string;
  phone: string;
  email: string;
  avatarUrl?: string;
  joinedAt: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  kycStatus: KYCStatus;
  verificationStatus: VerificationStatus;
  referralCode: string;
  referredBy?: string;
  rank: RankKey;
  status: "active" | "restricted" | "frozen" | "pending";
  riskLevel: RiskLevel;
  twoFactorEnabled: boolean;
  hasTransactionPin: boolean;
  profileCompletion: number;
  lastLoginAt: string;
  lastLoginIp: string;
  device: string;
  notificationPreferences: {
    email: boolean;
    sms: boolean;
    push: boolean;
    withdrawals: boolean;
    earnings: boolean;
    team: boolean;
    promotions: boolean;
  };
}

export interface DeviceSession {
  id: ID;
  device: string;
  browser: string;
  location: string;
  ip: string;
  lastActiveAt: string;
  current: boolean;
  status: "active" | "revoked";
}

/* ------------------------------------------------------------------ */
/* Wallet & ledger                                                     */
/* ------------------------------------------------------------------ */

export interface WalletBalance {
  wallet: WalletType;
  label: string;
  balance: number;
  locked: boolean;
  description: string;
}

export interface WalletSummary {
  totalAvailable: number;
  totalBalance: number;
  balances: WalletBalance[];
  updatedAt: string;
}

export interface PortfolioPoint {
  date: string;
  portfolio: number;
  earnings: number;
  invested: number;
}

export interface LedgerEntry {
  id: ID;
  journalId: ID;
  account: string;
  accountCode: string;
  direction: "debit" | "credit";
  amount: number;
  currency: "KES";
}

export interface LedgerJournal {
  id: ID;
  reference: string;
  type: TransactionType;
  description: string;
  totalAmount: number;
  entries: LedgerEntry[];
  createdAt: string;
  actor: string;
  userAccountNumber?: string;
  immutable: true;
}

/* ------------------------------------------------------------------ */
/* Transactions                                                        */
/* ------------------------------------------------------------------ */

export interface TransactionEvent {
  id: ID;
  label: string;
  description: string;
  timestamp: string;
  status: "done" | "current" | "upcoming";
}

export interface Transaction {
  id: ID;
  reference: string;
  type: TransactionType;
  status: TransactionStatus;
  direction: "incoming" | "outgoing";
  amount: number;
  fee: number;
  netAmount: number;
  wallet: WalletType;
  description: string;
  counterparty?: string;
  createdAt: string;
  updatedAt: string;
  productId?: ID;
  depositId?: ID;
  withdrawalId?: ID;
  notes?: string;
  events: TransactionEvent[];
}

export interface TransactionFilter {
  types?: TransactionType[];
  statuses?: TransactionStatus[];
  wallets?: WalletType[];
  from?: string;
  to?: string;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  pageSize?: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/* ------------------------------------------------------------------ */
/* Products & investments                                              */
/* ------------------------------------------------------------------ */

export interface Product {
  id: ID;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  tier: ProductTier;
  status: ProductStatus;
  featured: boolean;
  badge?: "popular" | "limited" | "new" | "sold_out";
  minEntry: number;
  maxEntry: number;
  stepAmount: number;
  durationDays: number;
  dailyRate: number;
  dailyEarningAtEntry: number;
  totalPayoutMultiplier: number;
  capacityTotal: number;
  capacityUsed: number;
  icon: "seedling" | "trending-up" | "gem" | "layers" | "zap";
  terms: string[];
  eligibility: string[];
  faq: { question: string; answer: string }[];
  riskNote: string;
  createdAt: string;
  version: number;
}

export interface ProductVersion {
  id: ID;
  productId: ID;
  version: number;
  dailyRate: number;
  minEntry: number;
  maxEntry: number;
  durationDays: number;
  changedAt: string;
  changedBy: string;
  note: string;
}

export interface Investment {
  id: ID;
  reference: string;
  productId: ID;
  product: Pick<Product, "id" | "slug" | "name" | "tier" | "icon" | "dailyRate" | "durationDays">;
  amount: number;
  dailyEarning: number;
  projectedEarnings: number;
  projectedPayout: number;
  earnedToDate: number;
  startDate: string;
  maturityDate: string;
  daysElapsed: number;
  daysRemaining: number;
  status: InvestmentStatus;
  wallet: WalletType;
  certificateUrl: string;
  createdAt: string;
}

export interface EarningScheduleItem {
  id: ID;
  investmentId: ID;
  day: number;
  date: string;
  amount: number;
  status: EarningStatus;
  creditedAt?: string;
}

export interface EarningScheduleSummary {
  items: EarningScheduleItem[];
  totalCredited: number;
  totalScheduled: number;
}

/* ------------------------------------------------------------------ */
/* Deposits (M-Pesa STK simulation / PayPal)                           */
/* ------------------------------------------------------------------ */

export interface Deposit {
  id: ID;
  reference: string;
  amount: number;
  fee: number;
  wallet: WalletType;
  phone: string;
  method: PaymentMethod;
  providerReference?: string;
  status: DepositStatus;
  checkoutRequestId: string;
  merchantRequestId: string;
  createdAt: string;
  completedAt?: string;
  failureReason?: string;
  events: TransactionEvent[];
}

export interface MpesaStkRequest {
  id: ID;
  depositId: ID;
  merchantRequestId: string;
  checkoutRequestId: string;
  phone: string;
  amount: number;
  status: "pending" | "success" | "failure" | "cancelled";
  createdAt: string;
  expiresAt: string;
}

/* ------------------------------------------------------------------ */
/* Withdrawals                                                         */
/* ------------------------------------------------------------------ */

export interface PayoutAccount {
  id: ID;
  nickname: string;
  phone: string;
  provider: "M-Pesa";
  isPrimary: boolean;
  verified: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

export interface Withdrawal {
  id: ID;
  reference: string;
  amount: number;
  fee: number;
  netAmount: number;
  wallet: WalletType;
  payoutAccount: Pick<PayoutAccount, "id" | "nickname" | "phone">;
  status: WithdrawalStatus;
  riskScore: number;
  riskLevel: RiskLevel;
  pinVerified: boolean;
  otpVerified: boolean;
  approvals: WithdrawalApproval[];
  createdAt: string;
  paidAt?: string;
  rejectionReason?: string;
  events: TransactionEvent[];
  user?: { id: ID; fullName: string; accountNumber: string };
}

export interface WithdrawalApproval {
  id: ID;
  step: 1 | 2;
  approver: string;
  role: string;
  action: "pending" | "approved" | "rejected";
  reason?: string;
  at?: string;
}

/* ------------------------------------------------------------------ */
/* Team, referrals, rewards                                            */
/* ------------------------------------------------------------------ */

export interface TeamMember {
  id: ID;
  fullName: string;
  level: 1 | 2 | 3;
  parentName: string;
  joinedAt: string;
  active: boolean;
  verified: boolean;
  teamVolume: number;
  rewardContribution: number;
  downlineCount: number;
  maskedPhone: string;
}

export interface TeamLevelBreakdown {
  level: 1 | 2 | 3;
  label: string;
  members: number;
  activeMembers: number;
  volume: number;
  rewards: number;
  ratePercent: number;
}

export interface TeamSummary {
  totalMembers: number;
  directReferrals: number;
  activeMembers: number;
  totalVolume: number;
  totalRewards: number;
  pendingRewards: number;
  currentRank: RankKey;
  nextRank?: RankKey;
  rankProgress: number;
  rankCriteria: { label: string; current: number; required: number }[];
  referralCode: string;
  referralUrl: string;
  levels: TeamLevelBreakdown[];
  recentMembers: TeamMember[];
}

export interface RankDef {
  key: RankKey;
  label: string;
  minDirect: number;
  minTeamSize: number;
  minVolume: number;
  rewardsRate: { level1: number; level2: number; level3: number };
  perks: string[];
}

export interface TeamReward {
  id: ID;
  reference: string;
  sourceMember: string;
  level: 1 | 2 | 3;
  sourceType: "investment" | "deposit" | "campaign";
  amount: number;
  commissionRate: number;
  status: RewardStatus;
  createdAt: string;
  reversedReason?: string;
}

export interface CommissionRule {
  id: ID;
  name: string;
  level: 1 | 2 | 3;
  percent: number;
  minRank: RankKey;
  active: boolean;
  updatedAt: string;
}

export interface ReferralActivity {
  id: ID;
  memberName: string;
  level: 1 | 2 | 3;
  event: "signup" | "verified" | "invested" | "reward";
  detail: string;
  amount?: number;
  at: string;
}

/* ------------------------------------------------------------------ */
/* Bonuses, coupons, campaigns                                         */
/* ------------------------------------------------------------------ */

export interface Coupon {
  id: ID;
  code: string;
  title: string;
  description: string;
  type: "bonus_percent" | "bonus_flat" | "fee_waiver" | "cashback";
  value: number;
  minAmount?: number;
  maxRedemption?: number;
  redemptions: number;
  expiresAt: string;
  active: boolean;
}

export interface Campaign {
  id: ID;
  name: string;
  description: string;
  startsAt: string;
  endsAt: string;
  status: "scheduled" | "active" | "ended" | "draft";
  audience: string;
  awardsIssued: number;
  budget: number;
  spent: number;
  accent: "lime" | "gold" | "blue" | "emerald";
}

export interface BonusAward {
  id: ID;
  reference: string;
  title: string;
  description: string;
  amount: number;
  status: RewardStatus;
  wallet: WalletType;
  source: string;
  awardedAt: string;
  expiresAt?: string;
  campaignId?: ID;
}

/* ------------------------------------------------------------------ */
/* Support, notifications, announcements                               */
/* ------------------------------------------------------------------ */

export interface SupportMessage {
  id: ID;
  ticketId: ID;
  author: string;
  authorRole: "user" | "agent" | "system";
  body: string;
  attachments?: { name: string; size: string }[];
  at: string;
}

export interface SupportTicket {
  id: ID;
  reference: string;
  subject: string;
  category: "deposits" | "withdrawals" | "investments" | "account" | "rewards" | "other";
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  slaDueAt: string;
  lastReplyBy?: "user" | "agent";
  messages: SupportMessage[];
  satisfaction?: 1 | 2 | 3 | 4 | 5;
}

export interface AppNotification {
  id: ID;
  category: NotificationCategory;
  title: string;
  body: string;
  read: boolean;
  at: string;
  actionHref?: string;
  actionLabel?: string;
}

export interface Announcement {
  id: ID;
  title: string;
  body: string;
  severity: "info" | "warning" | "success";
  publishedAt: string;
  audience: string;
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

export interface AdminStaff {
  id: ID;
  fullName: string;
  email: string;
  role: Role;
  status: "active" | "invited" | "suspended";
  lastActiveAt: string;
  permissions: string[];
}

export interface AuditLog {
  id: ID;
  actor: string;
  actorRole: Role;
  action: string;
  entityType: string;
  entityId: string;
  reason: string;
  oldValue?: string;
  newValue?: string;
  ip: string;
  at: string;
}

export interface RiskFlag {
  id: ID;
  userAccountNumber: string;
  userName: string;
  rule: string;
  level: RiskLevel;
  detail: string;
  status: "open" | "reviewing" | "cleared" | "escalated";
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
}

export interface AdminDashboardSummary {
  totalUsers: number;
  newUsersToday: number;
  verifiedUsers: number;
  activeUsers: number;
  totalDeposits: number;
  depositsToday: number;
  pendingDeposits: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
  failedWithdrawals: number;
  totalInvestments: number;
  activeInvestments: number;
  dailyEarningsCredited: number;
  teamRewardsIssued: number;
  openTickets: number;
  highRiskAccounts: number;
  reconciliationMismatches: number;
}

/* ------------------------------------------------------------------ */
/* API envelopes                                                       */
/* ------------------------------------------------------------------ */

export interface ApiResult<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  message: string;
  code?: string;
  fieldErrors?: Record<string, string>;
}

export type ApiResponse<T> = ApiResult<T> | ApiError;

export interface PageStats {
  activeMembers: number;
  productsAvailable: number;
  rewardsTracked: number;
  transactionsProcessed: number;
}

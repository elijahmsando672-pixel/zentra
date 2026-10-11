import { WALLET_META } from "@/lib/constants";
import type {
  AdminStaff,
  AppNotification,
  AuditLog,
  BonusAward,
  Campaign,
  CommissionRule,
  Coupon,
  Deposit,
  DeviceSession,
  Investment,
  LedgerEntry,
  LedgerJournal,
  PayoutAccount,
  Product,
  ReferralActivity,
  RiskFlag,
  SupportMessage,
  SupportTicket,
  TeamMember,
  TeamReward,
  Transaction,
  User,
  WalletBalance,
  WalletSummary,
  WalletType,
  Withdrawal,
} from "@/lib/types";
import type {
  AdminStaff as PrismaAdminStaff,
  AuditLog as PrismaAuditLog,
  BonusAward as PrismaBonusAward,
  Campaign as PrismaCampaign,
  CommissionRule as PrismaCommissionRule,
  Coupon as PrismaCoupon,
  Deposit as PrismaDeposit,
  Investment as PrismaInvestment,
  LedgerEntry as PrismaLedgerEntry,
  LedgerJournal as PrismaLedgerJournal,
  Notification as PrismaNotification,
  PayoutAccount as PrismaPayoutAccount,
  Product as PrismaProduct,
  ReferralActivity as PrismaReferralActivity,
  RiskFlag as PrismaRiskFlag,
  Session as PrismaSession,
  SupportMessage as PrismaSupportMessage,
  SupportTicket as PrismaSupportTicket,
  TeamMember as PrismaTeamMember,
  TeamReward as PrismaTeamReward,
  Transaction as PrismaTransaction,
  User as PrismaUser,
  Wallet as PrismaWallet,
  Withdrawal as PrismaWithdrawal,
} from "@prisma/client";

const DAY = 86_400_000;
const num = (value: unknown) => Number(value);
const round2 = (value: number) => Number(value.toFixed(2));

const WALLET_ORDER: WalletType[] = [
  "deposit",
  "investment",
  "earnings",
  "team_rewards",
  "bonus",
  "pending_withdrawal",
  "locked",
];

export function mapUser(u: PrismaUser): User {
  return {
    id: u.id,
    accountNumber: u.accountNumber,
    fullName: u.fullName,
    phone: u.phone,
    email: u.email,
    joinedAt: u.joinedAt.toISOString(),
    phoneVerified: u.phoneVerified,
    emailVerified: u.emailVerified,
    kycStatus: u.kycStatus,
    verificationStatus: u.verificationStatus,
    referralCode: u.referralCode,
    referredBy: u.referredBy ?? undefined,
    rank: u.rank,
    status: u.status,
    riskLevel: u.riskLevel,
    twoFactorEnabled: u.twoFactorEnabled,
    hasTransactionPin: u.hasTransactionPin,
    profileCompletion: u.profileCompletion,
    lastLoginAt: u.lastLoginAt.toISOString(),
    lastLoginIp: u.lastLoginIp,
    device: u.device,
    notificationPreferences: (u.notificationPreferences ?? {}) as User["notificationPreferences"],
  };
}

export function mapProduct(p: PrismaProduct): Product {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    tagline: p.tagline,
    description: p.description,
    tier: p.tier,
    status: p.status,
    featured: p.featured,
    badge: p.badge ?? undefined,
    minEntry: num(p.minEntry),
    maxEntry: num(p.maxEntry),
    stepAmount: num(p.stepAmount),
    durationDays: p.durationDays,
    dailyRate: num(p.dailyRate),
    dailyEarningAtEntry: num(p.dailyEarningAtEntry),
    totalPayoutMultiplier: num(p.totalPayoutMultiplier),
    capacityTotal: num(p.capacityTotal),
    capacityUsed: num(p.capacityUsed),
    icon: p.icon as Product["icon"],
    terms: (p.terms ?? []) as string[],
    eligibility: (p.eligibility ?? []) as string[],
    faq: (p.faq ?? []) as Product["faq"],
    riskNote: p.riskNote,
    createdAt: p.createdAt.toISOString(),
    version: p.version,
  };
}

type InvestmentWithProduct = PrismaInvestment & { product: PrismaProduct };

export function mapInvestment(inv: InvestmentWithProduct): Investment {
  const duration = inv.product.durationDays;
  const rawElapsed = Math.floor((Date.now() - inv.startDate.getTime()) / DAY);
  const daysElapsed =
    inv.status === "completed"
      ? duration
      : Math.min(duration, Math.max(0, rawElapsed));
  const daysRemaining = Math.max(0, duration - daysElapsed);

  return {
    id: inv.id,
    reference: inv.reference,
    productId: inv.productId,
    product: {
      id: inv.product.id,
      slug: inv.product.slug,
      name: inv.product.name,
      tier: inv.product.tier,
      icon: inv.product.icon as Product["icon"],
      dailyRate: num(inv.product.dailyRate),
      durationDays: inv.product.durationDays,
    },
    amount: num(inv.amount),
    dailyEarning: num(inv.dailyEarning),
    projectedEarnings: num(inv.projectedEarnings),
    projectedPayout: num(inv.projectedPayout),
    earnedToDate: num(inv.earnedToDate),
    startDate: inv.startDate.toISOString(),
    maturityDate: inv.maturityDate.toISOString(),
    daysElapsed,
    daysRemaining,
    status: inv.status,
    wallet: inv.wallet,
    certificateUrl: `/records/${inv.reference}/certificate.pdf`,
    createdAt: inv.createdAt.toISOString(),
  };
}

export function mapDeposit(d: PrismaDeposit): Deposit {
  return {
    id: d.id,
    reference: d.reference,
    amount: num(d.amount),
    fee: num(d.fee),
    wallet: d.wallet,
    phone: d.phone,
    method: d.method,
    providerReference: d.providerReference ?? undefined,
    status: d.status,
    checkoutRequestId: d.checkoutRequestId ?? "",
    merchantRequestId: d.merchantRequestId ?? "",
    createdAt: d.createdAt.toISOString(),
    completedAt: d.completedAt?.toISOString(),
    failureReason: d.failureReason ?? undefined,
    events: (d.events ?? []) as unknown as Deposit["events"],
  };
}

type WithdrawalWithAccount = PrismaWithdrawal & {
  payoutAccount: PrismaPayoutAccount;
  user?: { id: string; fullName: string; accountNumber: string } | null;
};

export function mapWithdrawal(w: WithdrawalWithAccount): Withdrawal {
  return {
    id: w.id,
    reference: w.reference,
    amount: num(w.amount),
    fee: num(w.fee),
    netAmount: num(w.netAmount),
    wallet: w.wallet,
    payoutAccount: {
      id: w.payoutAccount.id,
      nickname: w.payoutAccount.nickname,
      phone: w.payoutAccount.phone,
    },
    status: w.status,
    riskScore: w.riskScore,
    riskLevel: w.riskLevel,
    pinVerified: w.pinVerified,
    otpVerified: w.otpVerified,
    approvals: (w.approvals ?? []) as unknown as Withdrawal["approvals"],
    createdAt: w.createdAt.toISOString(),
    paidAt: w.paidAt?.toISOString(),
    rejectionReason: w.rejectionReason ?? undefined,
    events: (w.events ?? []) as unknown as Withdrawal["events"],
    user: w.user
      ? { id: w.user.id, fullName: w.user.fullName, accountNumber: w.user.accountNumber }
      : undefined,
  };
}

export function mapTransaction(t: PrismaTransaction): Transaction {
  return {
    id: t.id,
    reference: t.reference,
    type: t.type,
    status: t.status,
    direction: t.direction,
    amount: num(t.amount),
    fee: num(t.fee),
    netAmount: num(t.netAmount),
    wallet: t.wallet,
    description: t.description,
    counterparty: t.counterparty ?? undefined,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    productId: t.productId ?? undefined,
    depositId: t.depositId ?? undefined,
    withdrawalId: t.withdrawalId ?? undefined,
    events: (t.events ?? []) as unknown as Transaction["events"],
  };
}

export function mapNotification(n: PrismaNotification): AppNotification {
  return {
    id: n.id,
    category: n.category,
    title: n.title,
    body: n.message,
    read: n.read,
    at: n.createdAt.toISOString(),
    actionHref: n.actionUrl ?? undefined,
    actionLabel: n.actionLabel ?? undefined,
  };
}

export function mapPayoutAccount(a: PrismaPayoutAccount): PayoutAccount {
  return {
    id: a.id,
    nickname: a.nickname,
    phone: a.phone,
    provider: "M-Pesa",
    isPrimary: a.isPrimary,
    verified: a.verified,
    createdAt: a.createdAt.toISOString(),
    lastUsedAt: a.lastUsedAt?.toISOString(),
  };
}

export function mapWallets(rows: PrismaWallet[]): WalletSummary {
  const byType = new Map(rows.map((r) => [r.wallet, r]));
  const balances: WalletBalance[] = WALLET_ORDER.filter((w) => byType.has(w)).map((w) => {
    const row = byType.get(w)!;
    const meta = WALLET_META[w];
    return {
      wallet: w,
      label: meta.label,
      balance: round2(num(row.balance)),
      locked: row.locked,
      description: meta.description,
    };
  });

  const totalAvailable = round2(
    balances.filter((b) => !b.locked).reduce((sum, b) => sum + b.balance, 0)
  );
  const totalBalance = round2(balances.reduce((sum, b) => sum + b.balance, 0));
  const updatedAt =
    rows.length > 0
      ? new Date(Math.max(...rows.map((r) => r.updatedAt.getTime()))).toISOString()
      : new Date().toISOString();

  return { totalAvailable, totalBalance, balances, updatedAt };
}

export function parseUserAgent(ua: string | null) {
  const source = ua ?? "";
  const browser = /Edg/i.test(source)
    ? "Edge"
    : /Chrome/i.test(source)
      ? "Chrome"
      : /Firefox/i.test(source)
        ? "Firefox"
        : /Safari/i.test(source)
          ? "Safari"
          : "Browser";
  const os = /Android/i.test(source)
    ? "Android"
    : /iPhone|iPad|iOS/i.test(source)
      ? "iOS"
      : /Windows/i.test(source)
        ? "Windows"
        : /Mac/i.test(source)
          ? "macOS"
          : /Linux/i.test(source)
            ? "Linux"
            : "Web";
  return { browser, device: `${browser} · ${os}` };
}

export function mapSession(s: PrismaSession, currentTokenHash: string | null): DeviceSession {
  const { browser, device } = parseUserAgent(s.userAgent);
  const revoked = !!s.revokedAt;
  return {
    id: s.id,
    device,
    browser,
    location: "Nairobi, Kenya",
    ip: s.ip ?? "197.232.91.14",
    lastActiveAt: s.lastSeenAt.toISOString(),
    current: !revoked && s.token === currentTokenHash,
    status: revoked ? "revoked" : "active",
  };
}

export function mapTeamMember(m: PrismaTeamMember): TeamMember {
  return {
    id: m.id,
    fullName: m.fullName,
    level: m.level as TeamMember["level"],
    parentName: m.parentName,
    joinedAt: m.joinedAt.toISOString(),
    active: m.active,
    verified: m.verified,
    teamVolume: num(m.teamVolume),
    rewardContribution: num(m.rewardContribution),
    downlineCount: m.downlineCount,
    maskedPhone: m.maskedPhone,
  };
}

export function mapTeamReward(r: PrismaTeamReward): TeamReward {
  return {
    id: r.id,
    reference: r.reference,
    sourceMember: r.sourceMember,
    level: r.level as TeamReward["level"],
    sourceType: r.sourceType,
    amount: num(r.amount),
    commissionRate: num(r.commissionRate),
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    reversedReason: r.reversedReason ?? undefined,
  };
}

export function mapCommissionRule(r: PrismaCommissionRule): CommissionRule {
  return {
    id: r.id,
    name: r.name,
    level: r.level as CommissionRule["level"],
    percent: num(r.percent),
    minRank: r.minRank,
    active: r.active,
    updatedAt: r.updatedAt.toISOString(),
  };
}

export function mapReferralActivity(a: PrismaReferralActivity): ReferralActivity {
  return {
    id: a.id,
    memberName: a.memberName,
    level: a.level as ReferralActivity["level"],
    event: a.event,
    detail: a.detail,
    amount: a.amount == null ? undefined : num(a.amount),
    at: a.at.toISOString(),
  };
}

export function mapBonusAward(b: PrismaBonusAward): BonusAward {
  return {
    id: b.id,
    reference: b.reference,
    title: b.title,
    description: b.description,
    amount: num(b.amount),
    status: b.status,
    wallet: b.wallet,
    source: b.source,
    awardedAt: b.awardedAt.toISOString(),
    expiresAt: b.expiresAt?.toISOString(),
    campaignId: b.campaignId ?? undefined,
  };
}

export function mapCoupon(c: PrismaCoupon): Coupon {
  return {
    id: c.id,
    code: c.code,
    title: c.title,
    description: c.description,
    type: c.type,
    value: num(c.value),
    minAmount: c.minAmount == null ? undefined : num(c.minAmount),
    maxRedemption: c.maxRedemption ?? undefined,
    redemptions: c.redemptions,
    expiresAt: c.expiresAt.toISOString(),
    active: c.active,
  };
}

export function mapCampaign(c: PrismaCampaign): Campaign {
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    startsAt: c.startsAt.toISOString(),
    endsAt: c.endsAt.toISOString(),
    status: c.status,
    audience: c.audience,
    awardsIssued: c.awardsIssued,
    budget: num(c.budget),
    spent: num(c.spent),
    accent: c.accent,
  };
}

export function mapSupportMessage(m: PrismaSupportMessage): SupportMessage {
  return {
    id: m.id,
    ticketId: m.ticketId,
    author: m.author,
    authorRole: m.authorRole,
    body: m.body,
    attachments: (m.attachments ?? []) as unknown as SupportMessage["attachments"],
    at: m.at.toISOString(),
  };
}

type TicketWithMessages = PrismaSupportTicket & { messages: PrismaSupportMessage[] };

export function mapSupportTicket(t: TicketWithMessages): SupportTicket {
  return {
    id: t.id,
    reference: t.reference,
    subject: t.subject,
    category: t.category,
    status: t.status,
    priority: t.priority,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    slaDueAt: t.slaDueAt.toISOString(),
    lastReplyBy: (t.lastReplyBy ?? undefined) as SupportTicket["lastReplyBy"],
    messages: t.messages
      .slice()
      .sort((a, b) => +a.at - +b.at)
      .map(mapSupportMessage),
    satisfaction: (t.satisfaction ?? undefined) as SupportTicket["satisfaction"],
  };
}

export function mapAdminStaff(s: PrismaAdminStaff): AdminStaff {
  return {
    id: s.id,
    fullName: s.fullName,
    email: s.email,
    role: s.role,
    status: s.status as AdminStaff["status"],
    lastActiveAt: s.lastActiveAt.toISOString(),
    permissions: (s.permissions ?? []) as string[],
  };
}

export function mapAuditLog(l: PrismaAuditLog): AuditLog {
  return {
    id: l.id,
    actor: l.actor,
    actorRole: l.actorRole,
    action: l.action,
    entityType: l.entityType,
    entityId: l.entityId,
    reason: l.reason,
    oldValue: l.oldValue ?? undefined,
    newValue: l.newValue ?? undefined,
    ip: l.ip,
    at: l.at.toISOString(),
  };
}

export function mapRiskFlag(f: PrismaRiskFlag): RiskFlag {
  return {
    id: f.id,
    userAccountNumber: f.userAccountNumber,
    userName: f.userName,
    rule: f.rule,
    level: f.level,
    detail: f.detail,
    status: f.status,
    createdAt: f.createdAt.toISOString(),
    resolvedAt: f.resolvedAt?.toISOString(),
    resolution: f.resolution ?? undefined,
  };
}

export function mapLedgerEntry(e: PrismaLedgerEntry): LedgerEntry {
  return {
    id: e.id,
    journalId: e.journalId,
    account: e.account,
    accountCode: e.accountCode,
    direction: e.direction as LedgerEntry["direction"],
    amount: num(e.amount),
    currency: "KES",
  };
}

type JournalWithEntries = PrismaLedgerJournal & { entries: PrismaLedgerEntry[] };

export function mapLedgerJournal(j: JournalWithEntries): LedgerJournal {
  return {
    id: j.id,
    reference: j.reference,
    type: j.type,
    description: j.description,
    totalAmount: num(j.totalAmount),
    entries: j.entries.map(mapLedgerEntry),
    createdAt: j.createdAt.toISOString(),
    actor: j.actor,
    userAccountNumber: j.userAccountNumber ?? undefined,
    immutable: true,
  };
}

export type { InvestmentWithProduct, WithdrawalWithAccount, TicketWithMessages, JournalWithEntries };

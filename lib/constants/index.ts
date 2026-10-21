import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgePercent,
  Banknote,
  Bell,
  Bot,
  Box,
  ClipboardList,
  Coins,
  CreditCard,
  FileBarChart,
  FileText,
  Gauge,
  Gift,
  Headphones,
  History,
  Home,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  Lock,
  LogOut,
  MessageSquare,
  Network,
  Package,
  Percent,
  Receipt,
  Scale,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Star,
  Tickets,
  TrendingUp,
  UserCog,
  UserPlus,
  UserRound,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import type {
  InvestmentStatus,
  NotificationCategory,
  PaymentMethod,
  RankDef,
  RankKey,
  TransactionStatus,
  TransactionType,
  WalletType,
} from "@/lib/types";

export const APP_NAME = "Zentra";
export const APP_TAGLINE = "Build Your Next Level.";
export const APP_DESCRIPTION =
  "Discover products, manage your wallet, track your progress, and unlock rewards in one powerful platform.";
export const DEMO_DOMAIN = "app.zentra.demo";
export const DEFAULT_WHATSAPP_NUMBER = "0751249339";
export const SUPPORT_WHATSAPP = DEFAULT_WHATSAPP_NUMBER;

/* ------------------------------------------------------------------ */
/* Administrative contact & payment configuration                      */
/*                                                                     */
/* These defaults back the admin-configurable settings stored in       */
/* the SystemSetting "global" record (see /admin/settings). Operators  */
/* can change them from the console without touching code.             */
/* ------------------------------------------------------------------ */

export const ADMIN_NAME = "ANNABELLE Wendy";
export const ADMIN_EMAIL = "annabellewendy572@gmail.com";
export const SUPPORT_EMAIL = ADMIN_EMAIL;

/* M-Pesa Till remains unset until configured from the admin console. */
export const DEFAULT_MPESA_TILL_NUMBER = "";

export type PaymentMethodKey = PaymentMethod;

export const PAYMENT_METHOD_META: Record<
  PaymentMethod,
  { label: string; shortLabel: string; description: string; icon: typeof Smartphone }
> = {
  mpesa: {
    label: "M-Pesa",
    shortLabel: "M-Pesa",
    description: "Pay using the configured M-Pesa Till.",
    icon: Smartphone,
  },
  paypal: {
    label: "PayPal",
    shortLabel: "PayPal",
    description: "Pay by card or PayPal balance.",
    icon: Wallet,
  },
};
export const MIN_DEPOSIT = 100;
export const MAX_DEPOSIT = 250_000;
export const MIN_WITHDRAWAL = 500;
export const MAX_WITHDRAWAL = 100_000;
export const WITHDRAWAL_FEE_PERCENT = 1.5;
export const WITHDRAWAL_FEE_FLAT = 25;
export const DAILY_WITHDRAWAL_LIMIT = 150_000;
export const TRANSACTION_PIN_LENGTH = 4;
export const DEMO_TRANSACTION_PIN = "1234";

export const PRODUCT_TIERS = {
  starter: { label: "Starter", accent: "emerald" },
  growth: { label: "Growth", accent: "lime" },
  elite: { label: "Elite", accent: "gold" },
} as const;

export const WALLET_META: Record<
  WalletType,
  { label: string; shortLabel: string; hue: string; description: string; locked?: boolean }
> = {
  deposit: {
    label: "Deposit Wallet",
    shortLabel: "Deposit",
    hue: "#3B82F6",
    description: "Funds added through M-Pesa that are ready to invest.",
  },
  investment: {
    label: "Investment Wallet",
    shortLabel: "Investment",
    hue: "#101B35",
    description: "Capital committed across your active product plans.",
  },
  earnings: {
    label: "Earnings Wallet",
    shortLabel: "Earnings",
    hue: "#10B981",
    description: "Daily earnings credited from active investments.",
  },
  team_rewards: {
    label: "Team Rewards Wallet",
    shortLabel: "Team",
    hue: "#10B981",
    description: "Rewards earned from your three-level team structure.",
  },
  bonus: {
    label: "Bonus Wallet",
    shortLabel: "Bonus",
    hue: "#D4AF37",
    description: "Campaign bonuses, coupon redemptions and cashback.",
  },
  pending_withdrawal: {
    label: "Pending Withdrawal",
    shortLabel: "Pending",
    hue: "#F59E0B",
    description: "Funds reserved while a withdrawal is being reviewed.",
  },
  locked: {
    label: "Locked Funds",
    shortLabel: "Locked",
    hue: "#6B7280",
    description: "Funds locked as security hold or promotional condition.",
    locked: true,
  },
};

export const TRANSACTION_TYPE_META: Record<
  TransactionType,
  { label: string; icon: typeof Wallet; tone: "in" | "out" | "neutral" }
> = {
  deposit: { label: "Deposit", icon: ArrowDownLeft, tone: "in" },
  withdrawal: { label: "Withdrawal", icon: ArrowUpRight, tone: "out" },
  investment: { label: "Investment", icon: Package, tone: "out" },
  earning: { label: "Daily Earning", icon: TrendingUp, tone: "in" },
  team_reward: { label: "Team Reward", icon: Network, tone: "in" },
  bonus: { label: "Bonus", icon: Gift, tone: "in" },
  adjustment: { label: "Adjustment", icon: Scale, tone: "neutral" },
  transfer: { label: "Transfer", icon: Zap, tone: "neutral" },
};

export const STATUS_META: Record<
  TransactionStatus,
  { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral" }
> = {
  pending: { label: "Pending", tone: "warning" },
  processing: { label: "Processing", tone: "info" },
  successful: { label: "Successful", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  rejected: { label: "Rejected", tone: "danger" },
  on_hold: { label: "On hold", tone: "warning" },
};

export const INVESTMENT_STATUS_META: Record<
  InvestmentStatus,
  { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral" }
> = {
  active: { label: "Active", tone: "success" },
  maturing: { label: "Maturing soon", tone: "info" },
  completed: { label: "Completed", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export const RANKS: RankDef[] = [
  {
    key: "member",
    label: "Member",
    minDirect: 0,
    minTeamSize: 0,
    minVolume: 0,
    rewardsRate: { level1: 8, level2: 3, level3: 1 },
    perks: ["Access to all product plans", "Standard support"],
  },
  {
    key: "bronze",
    label: "Bronze",
    minDirect: 3,
    minTeamSize: 5,
    minVolume: 25_000,
    rewardsRate: { level1: 10, level2: 4, level3: 1.5 },
    perks: ["Priority support queue", "Bronze profile badge"],
  },
  {
    key: "silver",
    label: "Silver",
    minDirect: 6,
    minTeamSize: 15,
    minVolume: 120_000,
    rewardsRate: { level1: 12, level2: 5, level3: 2 },
    perks: ["Reduced withdrawal fees", "Monthly rewards statement"],
  },
  {
    key: "gold",
    label: "Gold",
    minDirect: 10,
    minTeamSize: 40,
    minVolume: 500_000,
    rewardsRate: { level1: 14, level2: 6, level3: 2.5 },
    perks: ["Dedicated account manager", "Early access to new plans"],
  },
  {
    key: "platinum",
    label: "Platinum",
    minDirect: 18,
    minTeamSize: 100,
    minVolume: 1_500_000,
    rewardsRate: { level1: 16, level2: 7, level3: 3 },
    perks: ["Platinum campaigns", "Invitation to partner events"],
  },
  {
    key: "diamond",
    label: "Diamond",
    minDirect: 30,
    minTeamSize: 250,
    minVolume: 5_000_000,
    rewardsRate: { level1: 18, level2: 8, level3: 3.5 },
    perks: ["Diamond council access", "Bespoke campaign eligibility"],
  },
];

export type Rank = (typeof RANKS)[number];

export const RANK_META: Record<RankKey, { label: string; accent: string }> = {
  member: { label: "Member", accent: "#6B7280" },
  bronze: { label: "Bronze", accent: "#B87333" },
  silver: { label: "Silver", accent: "#94A3B8" },
  gold: { label: "Gold", accent: "#D4AF37" },
  platinum: { label: "Platinum", accent: "#3B82F6" },
  diamond: { label: "Diamond", accent: "#10B981" },
};

export const NOTIFICATION_META: Record<
  NotificationCategory,
  { label: string; icon: typeof Bell }
> = {
  transaction: { label: "Transactions", icon: Receipt },
  team: { label: "Team", icon: Users },
  account: { label: "Account", icon: UserRound },
  support: { label: "Support", icon: Headphones },
  promotional: { label: "Promotions", icon: Sparkles },
  security: { label: "Security", icon: ShieldCheck },
};

export const DASHBOARD_NAV = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Products", href: "/dashboard/products", icon: Package },
  { label: "My Investments", href: "/investments", icon: TrendingUp },
  { label: "Wallet", href: "/wallet", icon: Wallet },
  { label: "Team", href: "/team", icon: Network },
  { label: "Rewards", href: "/dashboard/rewards", icon: Gift },
  { label: "Records", href: "/records", icon: ClipboardList },
  { label: "Statements", href: "/statements", icon: FileText },
  { label: "Support", href: "/support", icon: LifeBuoy },
  { label: "Profile & Security", href: "/profile", icon: ShieldCheck },
];

export const MOBILE_NAV = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Products", href: "/dashboard/products", icon: Package },
  { label: "Wallet", href: "/wallet", icon: Wallet },
  { label: "Team", href: "/team", icon: Network },
  { label: "Profile", href: "/profile", icon: UserRound },
];

export const ADMIN_NAV = [
  { label: "Overview", href: "/admin", icon: Gauge },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Investments", href: "/admin/investments", icon: TrendingUp },
  { label: "Deposits", href: "/admin/deposits", icon: ArrowDownLeft },
  { label: "Withdrawals", href: "/admin/withdrawals", icon: ArrowUpRight },
  { label: "Ledger", href: "/admin/ledger", icon: Landmark },
  { label: "Reconciliation", href: "/admin/reconciliation", icon: Scale },
  { label: "Referrals", href: "/admin/referrals", icon: Network },
  { label: "Commissions", href: "/admin/commissions", icon: Percent },
  { label: "Coupons", href: "/admin/coupons", icon: Tickets },
  { label: "Campaigns", href: "/admin/campaigns", icon: Sparkles },
  { label: "Support", href: "/admin/support", icon: MessageSquare },
  { label: "Announcements", href: "/admin/announcements", icon: Bell },
  { label: "Risk Center", href: "/admin/risk", icon: ShieldAlert },
  { label: "Reports", href: "/admin/reports", icon: FileBarChart },
  { label: "Staff & Roles", href: "/admin/staff", icon: UserCog },
  { label: "Audit Logs", href: "/admin/audit-logs", icon: History },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export const PUBLIC_NAV = [
  { label: "How It Works", href: "/how-it-works" },
  { label: "Products", href: "/products" },
  { label: "Rewards", href: "/rewards" },
  { label: "FAQs", href: "/faq" },
  { label: "Support", href: "/contact" },
];

export const FOOTER_LINKS = {
  product: [
    { label: "Products", href: "/products" },
    { label: "How it works", href: "/how-it-works" },
    { label: "Rewards", href: "/rewards" },
    { label: "FAQs", href: "/faq" },
  ],
  company: [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Announcements", href: "/faq" },
    { label: "Careers", href: "/about" },
  ],
  support: [
    { label: "Help centre", href: "/contact" },
    { label: "Open a ticket", href: "/contact" },
    { label: "WhatsApp", href: "/contact" },
    { label: "System status", href: "/contact" },
  ],
  legal: [
    { label: "Terms of service", href: "/terms" },
    { label: "Privacy policy", href: "/privacy" },
    { label: "Risk disclosure", href: "/risk-disclosure" },
    { label: "Cookie notice", href: "/privacy" },
  ],
};

export const ICON_MAP = {
  seedling: Shield,
  "trending-up": TrendingUp,
  gem: Star,
  layers: Box,
  zap: Zap,
  banknote: Banknote,
  creditcard: CreditCard,
  receipt: Receipt,
  search: Search,
  settings: Settings,
  cart: ShoppingCart,
  bot: Bot,
  file: FileText,
  lock: Lock,
  logout: LogOut,
  percent: BadgePercent,
  userPlus: UserPlus,
} as const;

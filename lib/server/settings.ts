import { prisma } from "@/lib/server/prisma";
import { DAILY_WITHDRAWAL_LIMIT, MAX_DEPOSIT, MAX_WITHDRAWAL, MIN_DEPOSIT, MIN_WITHDRAWAL } from "@/lib/constants";

/**
 * Runtime view of the admin-controlled `SystemSetting("global")` record.
 * Values are enforced by the API routes — not just displayed in the console.
 */
export type GlobalSettings = {
  maintenanceMode: boolean;
  registrationsOpen: boolean;
  depositsEnabled: boolean;
  withdrawalsEnabled: boolean;
  referralRewardsEnabled: boolean;
  autoContributionsEnabled: boolean;
  minDeposit: number;
  maxDeposit: number;
  minWithdrawal: number;
  maxWithdrawal: number;
  dailyWithdrawalLimit: number;
  supportSlaHours: number;
};

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  maintenanceMode: false,
  registrationsOpen: true,
  depositsEnabled: true,
  withdrawalsEnabled: true,
  referralRewardsEnabled: true,
  autoContributionsEnabled: false,
  minDeposit: MIN_DEPOSIT,
  maxDeposit: MAX_DEPOSIT,
  minWithdrawal: MIN_WITHDRAWAL,
  maxWithdrawal: MAX_WITHDRAWAL,
  dailyWithdrawalLimit: DAILY_WITHDRAWAL_LIMIT,
  supportSlaHours: 24,
};

const bool = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);
const positive = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export function normalizeGlobalSettings(raw: unknown): GlobalSettings {
  const value = (raw ?? {}) as Record<string, unknown>;
  const flags = (value.featureFlags ?? {}) as Record<string, unknown>;
  return {
    maintenanceMode: bool(value.maintenanceMode, DEFAULT_GLOBAL_SETTINGS.maintenanceMode),
    registrationsOpen: bool(value.registrationsOpen, DEFAULT_GLOBAL_SETTINGS.registrationsOpen),
    depositsEnabled: bool(value.depositsEnabled, DEFAULT_GLOBAL_SETTINGS.depositsEnabled),
    withdrawalsEnabled: bool(value.withdrawalsEnabled, DEFAULT_GLOBAL_SETTINGS.withdrawalsEnabled),
    referralRewardsEnabled: bool(value.referralRewardsEnabled, DEFAULT_GLOBAL_SETTINGS.referralRewardsEnabled),
    autoContributionsEnabled: bool(
      flags.autoContributionsEnabled,
      DEFAULT_GLOBAL_SETTINGS.autoContributionsEnabled
    ),
    minDeposit: positive(value.minDeposit, DEFAULT_GLOBAL_SETTINGS.minDeposit),
    maxDeposit: positive(value.maxDeposit, DEFAULT_GLOBAL_SETTINGS.maxDeposit),
    minWithdrawal: positive(value.minWithdrawal, DEFAULT_GLOBAL_SETTINGS.minWithdrawal),
    maxWithdrawal: positive(value.maxWithdrawal, DEFAULT_GLOBAL_SETTINGS.maxWithdrawal),
    dailyWithdrawalLimit: positive(value.dailyWithdrawalLimit, DEFAULT_GLOBAL_SETTINGS.dailyWithdrawalLimit),
    supportSlaHours: positive(value.supportSlaHours, DEFAULT_GLOBAL_SETTINGS.supportSlaHours),
  };
}

export async function getGlobalSettings(): Promise<GlobalSettings> {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: "global" } });
    return normalizeGlobalSettings(setting?.value);
  } catch (error) {
    console.error("[settings] falling back to defaults", error);
    return DEFAULT_GLOBAL_SETTINGS;
  }
}

export async function isDepositsEnabled() {
  const settings = await getGlobalSettings();
  return !settings.maintenanceMode && settings.depositsEnabled;
}

export async function isWithdrawalsEnabled() {
  const settings = await getGlobalSettings();
  return !settings.maintenanceMode && settings.withdrawalsEnabled;
}

export async function isRegistrationsOpen() {
  const settings = await getGlobalSettings();
  return !settings.maintenanceMode && settings.registrationsOpen;
}

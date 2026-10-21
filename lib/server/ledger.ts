import { Prisma } from "@prisma/client";
import { generateReference } from "@/lib/utils";
import type { WalletType } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Immutable double-entry ledger                                       */
/*                                                                     */
/* Every posted movement consists of balanced debit and credit lines   */
/* within one database transaction. Amounts are handled in integer     */
/* minor units (cents) so authoritative calculations never rely on     */
/* floating-point arithmetic. Posted journals are never updated —      */
/* corrections must be posted as new compensating journals.            */
/* ------------------------------------------------------------------ */

export const LEDGER_CURRENCY = "KES";
const MAX_CENTS = 99_999_999_999_999;

export type LedgerDirection = "debit" | "credit";

export type LedgerLineInput = {
  account: string;
  accountCode: string;
  direction: LedgerDirection;
  amount: string | number;
};

export type PostJournalInput = {
  type:
    | "deposit"
    | "withdrawal"
    | "investment"
    | "earning"
    | "team_reward"
    | "bonus"
    | "adjustment"
    | "transfer";
  description: string;
  actor: string;
  userAccountNumber?: string | null;
  /** Stable unique reference. Reusing a reference is rejected by the database. */
  reference?: string;
  entries: LedgerLineInput[];
};

export type LedgerAccountRef = { account: string; accountCode: string };

const WALLET_ABBR: Record<WalletType, string> = {
  deposit: "DEP",
  investment: "INV",
  earnings: "EARN",
  team_rewards: "TRW",
  bonus: "BON",
  pending_withdrawal: "PWD",
  locked: "LCK",
};

const SAFE_ACCOUNT_NUMBER = /^[A-Za-z0-9-]{1,32}$/;

/** User wallet account: money the platform owes a member, per wallet bucket. */
export function userWalletAccount(accountNumber: string, wallet: WalletType): LedgerAccountRef {
  if (!SAFE_ACCOUNT_NUMBER.test(accountNumber)) {
    throw new Error("Invalid account number for ledger account.");
  }
  return {
    account: `user:${accountNumber}:${wallet}`,
    accountCode: `U-${accountNumber}-${WALLET_ABBR[wallet]}`,
  };
}

/** Provider cash held with M-Pesa (cash-in-transit / settlement account). */
export function mpesaCashAccount(): LedgerAccountRef {
  return { account: "system:provider:mpesa", accountCode: "1010-MPESA" };
}

/** Provider cash held with PayPal. */
export function paypalCashAccount(): LedgerAccountRef {
  return { account: "system:provider:paypal", accountCode: "1011-PAYPAL" };
}

/** Contra account debited when daily earnings are credited to members. */
export function earningsYieldAccount(): LedgerAccountRef {
  return { account: "system:income:earnings", accountCode: "4000-YIELD" };
}

/** Fee income recognised on withdrawal fees. */
export function feeIncomeAccount(): LedgerAccountRef {
  return { account: "system:income:fees", accountCode: "4100-FEES" };
}

/** Promotional expense for team rewards and bonuses. */
export function rewardsExpenseAccount(): LedgerAccountRef {
  return { account: "system:promotion:rewards", accountCode: "5100-REW" };
}

/** Convert a decimal amount in major units into exact integer cents. */
export function toCents(value: string | number | { toString(): string }): number {
  const text = typeof value === "string" ? value : value.toString();
  if (!/^-?\d+(\.\d+)?$/.test(text.trim())) {
    throw new Error(`Invalid monetary amount: ${text}`);
  }
  const negative = text.trim().startsWith("-");
  const [whole, fraction = ""] = text.trim().replace("-", "").split(".");
  const cents = Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
  if (!Number.isSafeInteger(cents) || cents > MAX_CENTS) {
    throw new Error(`Monetary amount out of range: ${text}`);
  }
  return negative ? -cents : cents;
}

/** Render integer cents as a decimal string suitable for Decimal(14,2) columns. */
export function centsToDecimalString(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  return `${negative ? "-" : ""}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Validate a set of ledger lines: non-empty, positive amounts, balanced. */
export function assertBalancedEntries(entries: LedgerLineInput[]): number {
  if (entries.length < 2) throw new Error("A journal requires at least two entries.");
  let debits = 0;
  let credits = 0;
  for (const entry of entries) {
    if (entry.direction !== "debit" && entry.direction !== "credit") {
      throw new Error("Ledger entry direction must be debit or credit.");
    }
    if (!entry.account || !entry.accountCode) {
      throw new Error("Ledger entries require an account and account code.");
    }
    const cents = toCents(entry.amount);
    if (cents <= 0) throw new Error("Ledger entry amounts must be positive; direction carries the sign.");
    if (entry.direction === "debit") debits += cents;
    else credits += cents;
  }
  if (debits !== credits) {
    throw new Error(`Unbalanced journal: debits ${centsToDecimalString(debits)} != credits ${centsToDecimalString(credits)}.`);
  }
  if (debits === 0) throw new Error("Journal total must be greater than zero.");
  return debits;
}

type PrismaClientLike = Prisma.TransactionClient;

/**
 * Post a balanced journal with its entries inside the caller's transaction.
 * The journal reference is unique — retries of the same operation must reuse
 * the status-guarded outer transaction so a movement can never post twice.
 */
export async function postJournal(tx: PrismaClientLike, input: PostJournalInput) {
  const totalCents = assertBalancedEntries(input.entries);
  const reference = input.reference ?? generateReference("JRN");
  const journal = await tx.ledgerJournal.create({
    data: {
      reference,
      type: input.type,
      description: input.description,
      totalAmount: centsToDecimalString(totalCents),
      actor: input.actor,
      userAccountNumber: input.userAccountNumber ?? null,
      immutable: true,
      entries: {
        create: input.entries.map((entry) => ({
          account: entry.account,
          accountCode: entry.accountCode,
          direction: entry.direction,
          amount: centsToDecimalString(toCents(entry.amount)),
          currency: LEDGER_CURRENCY,
        })),
      },
    },
    include: { entries: true },
  });
  return journal;
}

/* ------------------------------------------------------------------ */
/* Standard posting recipes                                             */
/* ------------------------------------------------------------------ */

/** Provider funds received → member deposit wallet credited. */
export function depositEntries(
  accountNumber: string,
  provider: "mpesa" | "paypal",
  amountCents: number
): LedgerLineInput[] {
  const cash = provider === "mpesa" ? mpesaCashAccount() : paypalCashAccount();
  const wallet = userWalletAccount(accountNumber, "deposit");
  return [
    { ...cash, direction: "debit", amount: centsToDecimalString(amountCents) },
    { ...wallet, direction: "credit", amount: centsToDecimalString(amountCents) },
  ];
}

/** Withdrawal request: funds held in the pending-withdrawal bucket. */
export function withdrawalHoldEntries(
  accountNumber: string,
  wallet: WalletType,
  amountCents: number
): LedgerLineInput[] {
  const source = userWalletAccount(accountNumber, wallet);
  const pending = userWalletAccount(accountNumber, "pending_withdrawal");
  return [
    { ...source, direction: "debit", amount: centsToDecimalString(amountCents) },
    { ...pending, direction: "credit", amount: centsToDecimalString(amountCents) },
  ];
}

/** Withdrawal paid: hold released to provider cash, fee recognised as income. */
export function withdrawalPaidEntries(
  accountNumber: string,
  provider: "mpesa" | "paypal",
  grossCents: number,
  feeCents: number
): LedgerLineInput[] {
  const pending = userWalletAccount(accountNumber, "pending_withdrawal");
  const cash = provider === "mpesa" ? mpesaCashAccount() : paypalCashAccount();
  const fee = feeIncomeAccount();
  const lines: LedgerLineInput[] = [
    { ...pending, direction: "debit", amount: centsToDecimalString(grossCents) },
    { ...cash, direction: "credit", amount: centsToDecimalString(grossCents - feeCents) },
  ];
  if (feeCents > 0) lines.push({ ...fee, direction: "credit", amount: centsToDecimalString(feeCents) });
  return lines;
}

/** Withdrawal rejected: hold returned to the original wallet. */
export function withdrawalReleaseEntries(
  accountNumber: string,
  wallet: WalletType,
  amountCents: number
): LedgerLineInput[] {
  const pending = userWalletAccount(accountNumber, "pending_withdrawal");
  const source = userWalletAccount(accountNumber, wallet);
  return [
    { ...pending, direction: "debit", amount: centsToDecimalString(amountCents) },
    { ...source, direction: "credit", amount: centsToDecimalString(amountCents) },
  ];
}

/** Investment commitment: deposit wallet → investment wallet. */
export function investmentEntries(
  accountNumber: string,
  amountCents: number
): LedgerLineInput[] {
  const deposit = userWalletAccount(accountNumber, "deposit");
  const investment = userWalletAccount(accountNumber, "investment");
  return [
    { ...deposit, direction: "debit", amount: centsToDecimalString(amountCents) },
    { ...investment, direction: "credit", amount: centsToDecimalString(amountCents) },
  ];
}

/** Daily earning credited to the member's earnings wallet. */
export function earningEntries(
  accountNumber: string,
  amountCents: number
): LedgerLineInput[] {
  const yieldAccount = earningsYieldAccount();
  const earnings = userWalletAccount(accountNumber, "earnings");
  return [
    { ...yieldAccount, direction: "debit", amount: centsToDecimalString(amountCents) },
    { ...earnings, direction: "credit", amount: centsToDecimalString(amountCents) },
  ];
}

/** Internal wallet-to-wallet transfer for one member. */
export function transferEntries(
  accountNumber: string,
  from: WalletType,
  to: WalletType,
  amountCents: number
): LedgerLineInput[] {
  const source = userWalletAccount(accountNumber, from);
  const target = userWalletAccount(accountNumber, to);
  return [
    { ...source, direction: "debit", amount: centsToDecimalString(amountCents) },
    { ...target, direction: "credit", amount: centsToDecimalString(amountCents) },
  ];
}

/** Reward/bonus credited to a member wallet. */
export function rewardEntries(
  accountNumber: string,
  wallet: WalletType,
  amountCents: number
): LedgerLineInput[] {
  const expense = rewardsExpenseAccount();
  const target = userWalletAccount(accountNumber, wallet);
  return [
    { ...expense, direction: "debit", amount: centsToDecimalString(amountCents) },
    { ...target, direction: "credit", amount: centsToDecimalString(amountCents) },
  ];
}

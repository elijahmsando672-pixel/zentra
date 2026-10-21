import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/prisma";
import { toCents } from "@/lib/server/ledger";

/* ------------------------------------------------------------------ */
/* Statement construction                                              */
/*                                                                     */
/* A statement is derived from the customer transaction ledger. The     */
/* running balance tracks net customer funds across all wallets:        */
/* deposits, earnings, rewards and paid withdrawals move it; internal   */
/* wallet transfers and investment commitments do not.                  */
/* ------------------------------------------------------------------ */

export const STATEMENT_CURRENCY = "KES";
export const MAX_STATEMENT_DAYS = 366;
export const MAX_STATEMENT_ROWS = 10_000;

const TYPES = [
  "deposit",
  "withdrawal",
  "investment",
  "earning",
  "team_reward",
  "bonus",
  "adjustment",
  "transfer",
] as const;
const STATUSES = [
  "pending",
  "processing",
  "successful",
  "failed",
  "rejected",
  "cancelled",
  "on_hold",
] as const;

export type StatementType = (typeof TYPES)[number];
export type StatementStatus = (typeof STATUSES)[number];

export type StatementFilters = {
  from: Date;
  to: Date;
  types?: StatementType[];
  statuses?: StatementStatus[];
};

export type StatementRow = {
  id: string;
  reference: string;
  type: StatementType;
  status: StatementStatus;
  description: string;
  wallet: string;
  direction: string;
  createdAt: string;
  amountCents: number;
  feeCents: number;
  netAmountCents: number;
  creditCents: number | null;
  debitCents: number | null;
  balanceCents: number;
  internal: boolean;
};

export type Statement = {
  user: { fullName: string; accountNumber: string; email: string };
  period: { from: string; to: string };
  generatedAt: string;
  currency: string;
  openingBalanceCents: number;
  closingBalanceCents: number;
  totalCreditsCents: number;
  totalDebitsCents: number;
  rows: StatementRow[];
  totalsByType: Array<{ type: StatementType; count: number; creditsCents: number; debitsCents: number }>;
  walletBalances: Array<{ wallet: string; balanceCents: number }>;
  reconciliation: {
    walletTotalCents: number;
    ledgerLiabilityCents: number | null;
    ledgerPostedEntries: number;
    walletMatchesStatement: boolean;
    ledgerMatchesWallets: boolean | null;
    note: string;
  };
  notes: string[];
};

export function parseStatementRange(fromRaw: string | null, toRaw: string | null, now = new Date()) {
  if (!fromRaw || !toRaw) return { error: "Choose both a start and end date." as const };
  const from = new Date(`${fromRaw}T00:00:00.000Z`);
  const to = new Date(`${toRaw}T23:59:59.999Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { error: "Enter valid start and end dates." as const };
  }
  if (from > to) return { error: "The start date must be on or before the end date." as const };
  const days = Math.ceil((to.getTime() - from.getTime()) / 86_400_000);
  if (days > MAX_STATEMENT_DAYS) {
    return { error: `Statements cover at most ${MAX_STATEMENT_DAYS} days. Narrow the date range.` as const };
  }
  if (to.getTime() > now.getTime() + 86_400_000) {
    return { error: "The end date cannot be in the future." as const };
  }
  return { from, to };
}

export function parseStatementFilters(params: URLSearchParams): StatementFilters | { error: string } {
  const range = parseStatementRange(params.get("from"), params.get("to"));
  if ("error" in range) return range;
  const parseList = <T extends string>(raw: string | null, allowed: readonly T[]) => {
    if (!raw || raw === "all") return undefined;
    const values = raw.split(",").map((value) => value.trim()).filter(Boolean);
    const valid = values.filter((value): value is T => (allowed as readonly string[]).includes(value));
    if (valid.length !== values.length) return null;
    return valid;
  };
  const types = parseList(params.get("types"), TYPES);
  const statuses = parseList(params.get("statuses"), STATUSES);
  if (types === null) return { error: "One or more transaction types are invalid." };
  if (statuses === null) return { error: "One or more transaction statuses are invalid." };
  return { from: range.from, to: range.to, types, statuses };
}

type StatementTx = {
  id: string;
  reference: string;
  type: string;
  status: string;
  description: string;
  wallet: string;
  direction: string;
  createdAt: Date;
  amount: Prisma.Decimal;
  fee: Prisma.Decimal;
  netAmount: Prisma.Decimal;
};

/**
 * Signed effect of a transaction on net customer funds, in cents.
 * Internal movements (wallet transfers and investment commitments) net to zero
 * because the money stays inside the member's own wallets.
 */
export function statementEffectCents(tx: {
  type: string;
  status: string;
  direction: string;
  amountCents: number;
  netAmountCents: number;
}): number {
  if (tx.status !== "successful") return 0;
  switch (tx.type) {
    case "deposit":
    case "earning":
    case "team_reward":
    case "bonus":
      return tx.netAmountCents;
    case "withdrawal":
      return -tx.amountCents;
    case "adjustment":
      return tx.direction === "incoming" ? tx.netAmountCents : -tx.netAmountCents;
    default:
      return 0;
  }
}

export function statementMovement(tx: {
  type: string;
  direction: string;
  netAmountCents: number;
  amountCents: number;
}): { creditCents: number | null; debitCents: number | null; internal: boolean } {
  switch (tx.type) {
    case "deposit":
    case "earning":
    case "team_reward":
    case "bonus":
      return { creditCents: tx.netAmountCents, debitCents: null, internal: false };
    case "withdrawal":
      return { creditCents: null, debitCents: tx.amountCents, internal: false };
    case "adjustment":
      return tx.direction === "incoming"
        ? { creditCents: tx.netAmountCents, debitCents: null, internal: false }
        : { creditCents: null, debitCents: tx.netAmountCents, internal: false };
    default:
      return { creditCents: null, debitCents: null, internal: true };
  }
}

export async function buildStatement(
  userId: string,
  filters: StatementFilters,
  options?: { maxRows?: number }
): Promise<Statement | { error: string }> {
  const maxRows = options?.maxRows ?? MAX_STATEMENT_ROWS;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true, accountNumber: true, email: true },
  });
  if (!user) return { error: "Account not found." };

  const where: Prisma.TransactionWhereInput = {
    userId,
    createdAt: { lt: filters.to },
    ...(filters.types?.length ? { type: { in: filters.types } } : {}),
    ...(filters.statuses?.length ? { status: { in: filters.statuses } } : {}),
  };

  const [before, period, walletRows, ledgerEntries, ledgerCount] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, status: "successful", createdAt: { lt: filters.from } },
      select: { type: true, status: true, direction: true, amount: true, netAmount: true },
    }),
    prisma.transaction.findMany({
      where: where,
      orderBy: { createdAt: "asc" },
      take: maxRows + 1,
    }),
    prisma.wallet.findMany({ where: { userId }, select: { wallet: true, balance: true } }),
    prisma.ledgerEntry.findMany({
      where: { journal: { userAccountNumber: user.accountNumber } },
      select: { direction: true, amount: true },
    }),
    prisma.ledgerEntry.count({ where: { journal: { userAccountNumber: user.accountNumber } } }),
  ]);

  if (period.length > maxRows) {
    return { error: "This period has too many transactions for one statement. Narrow the date range." };
  }

  const openingBalanceCents = before.reduce(
    (sum, tx) =>
      sum +
      statementEffectCents({
        type: tx.type,
        status: tx.status,
        direction: tx.direction,
        amountCents: toCents(tx.amount),
        netAmountCents: toCents(tx.netAmount),
      }),
    0
  );

  let running = openingBalanceCents;
  let totalCreditsCents = 0;
  let totalDebitsCents = 0;
  const totals = new Map<string, { count: number; creditsCents: number; debitsCents: number }>();

  const rows: StatementRow[] = period.map((tx) => {
    const amountCents = toCents(tx.amount);
    const netAmountCents = toCents(tx.netAmount);
    const feeCents = toCents(tx.fee);
    const effect = statementEffectCents({
      type: tx.type,
      status: tx.status,
      direction: tx.direction,
      amountCents,
      netAmountCents,
    });
    running += effect;
    const movement = statementMovement({ type: tx.type, direction: tx.direction, netAmountCents, amountCents });
    if (movement.creditCents) totalCreditsCents += movement.creditCents;
    if (movement.debitCents) totalDebitsCents += movement.debitCents;
    const bucket = totals.get(tx.type) ?? { count: 0, creditsCents: 0, debitsCents: 0 };
    bucket.count += 1;
    bucket.creditsCents += movement.creditCents ?? 0;
    bucket.debitsCents += movement.debitCents ?? 0;
    totals.set(tx.type, bucket);
    return {
      id: tx.id,
      reference: tx.reference,
      type: tx.type as StatementType,
      status: tx.status as StatementStatus,
      description: tx.description,
      wallet: tx.wallet,
      direction: tx.direction,
      createdAt: tx.createdAt.toISOString(),
      amountCents,
      feeCents,
      netAmountCents,
      creditCents: movement.creditCents,
      debitCents: movement.debitCents,
      balanceCents: running,
      internal: movement.internal,
    };
  });

  const walletTotalCents = walletRows.reduce((sum, wallet) => sum + toCents(wallet.balance), 0);
  let ledgerLiabilityCents = 0;
  for (const entry of ledgerEntries) {
    const cents = toCents(entry.amount);
    ledgerLiabilityCents += entry.direction === "credit" ? cents : -cents;
  }
  const hasLedger = ledgerCount > 0;
  const closingBalanceCents = running;
  const periodEndsInPast = filters.to.getTime() < Date.now() - 86_400_000;
  const walletMatchesStatement = periodEndsInPast ? true : walletTotalCents === closingBalanceCents;

  const notes = [
    "Opening and closing balances reflect net customer funds across your Zentra wallets in KES.",
    "Internal wallet transfers and investment commitments are listed for completeness but do not change your net funds.",
    "Only completed (successful) transactions affect the running balance; pending and failed attempts do not.",
    "Projected investment earnings are estimates and are not included in the statement balance until credited.",
  ];

  return {
    user,
    period: { from: filters.from.toISOString(), to: filters.to.toISOString() },
    generatedAt: new Date().toISOString(),
    currency: STATEMENT_CURRENCY,
    openingBalanceCents,
    closingBalanceCents,
    totalCreditsCents,
    totalDebitsCents,
    rows,
    totalsByType: [...totals.entries()].map(([type, value]) => ({ type: type as StatementType, ...value })),
    walletBalances: walletRows.map((wallet) => ({ wallet: wallet.wallet, balanceCents: toCents(wallet.balance) })),
    reconciliation: {
      walletTotalCents,
      ledgerLiabilityCents: hasLedger ? ledgerLiabilityCents : null,
      ledgerPostedEntries: ledgerCount,
      walletMatchesStatement,
      ledgerMatchesWallets: hasLedger ? ledgerLiabilityCents === walletTotalCents : null,
      note: hasLedger
        ? ledgerLiabilityCents === walletTotalCents
          ? "Statement balances reconcile with posted double-entry ledger balances."
          : "Ledger and wallet balances differ. Finance has been flagged to review this account."
        : "No double-entry journals are posted for this account yet; balances are derived from transaction records.",
    },
    notes,
  };
}

export function formatStatementMoney(cents: number, sign = false) {
  const value = Math.abs(cents / 100).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const prefix = sign ? (cents < 0 ? "-" : "+") : cents < 0 ? "-" : "";
  return `${prefix}${STATEMENT_CURRENCY} ${value}`;
}

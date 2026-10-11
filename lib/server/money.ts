const MAX_MONEY_CENTS = 99_999_999_999_999;

export type ParsedMoney = {
  cents: number;
  decimal: string;
  value: number;
};

export function parsePositiveMoney(input: unknown): ParsedMoney | null {
  if (typeof input !== "number" && typeof input !== "string") return null;
  if (typeof input === "string" && input.trim() === "") return null;

  const value = Number(input);
  if (!Number.isFinite(value) || value <= 0) return null;

  const cents = Math.round(value * 100);
  if (
    cents <= 0 ||
    cents > MAX_MONEY_CENTS ||
    Math.abs(value * 100 - cents) > 1e-7
  ) {
    return null;
  }

  return { cents, decimal: `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`, value: cents / 100 };
}

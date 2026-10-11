import { bumpApiVersion } from "@/hooks/use-api";
import { apiRequest, round2 } from "@/lib/services/helpers";
import { clearIdempotencyKey, getIdempotencyKey } from "@/lib/services/idempotency";
import { WITHDRAWAL_FEE_FLAT, WITHDRAWAL_FEE_PERCENT } from "@/lib/constants";
import type { ApiResponse, WalletType, Withdrawal } from "@/lib/types";

export function computeWithdrawalFee(amount: number) {
  return round2((amount * WITHDRAWAL_FEE_PERCENT) / 100 + WITHDRAWAL_FEE_FLAT);
}

export interface WithdrawalQuote {
  amount: number;
  fee: number;
  netAmount: number;
  wallet: WalletType;
  payoutAccountId: string;
  withinDailyLimit: boolean;
  remainingDailyLimit: number;
}

export async function quoteWithdrawal(input: {
  amount: number;
  wallet: WalletType;
  payoutAccountId: string;
}): Promise<ApiResponse<WithdrawalQuote>> {
  return apiRequest<WithdrawalQuote>("/api/withdrawals/quote", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export interface CreateWithdrawalInput {
  amount: number;
  wallet: WalletType;
  payoutAccountId: string;
  pin: string;
}

export async function createWithdrawal(
  input: CreateWithdrawalInput
): Promise<ApiResponse<{ withdrawal: Withdrawal; reference: string }>> {
  const idempotencyKey = getIdempotencyKey("withdrawal");
  const res = await apiRequest<{ withdrawal: Withdrawal; reference: string }>(
    "/api/withdrawals/create",
    { method: "POST", body: JSON.stringify(input), headers: { "Idempotency-Key": idempotencyKey } }
  );
  if (res.ok) {
    clearIdempotencyKey("withdrawal");
    bumpApiVersion();
  }
  return res;
}

export async function verifyWithdrawalPin(pin: string): Promise<ApiResponse<{ verified: true }>> {
  return apiRequest<{ verified: true }>("/api/withdrawals/verify-pin", {
    method: "POST",
    body: JSON.stringify({ pin }),
  });
}

export async function getWithdrawals(filter?: {
  status?: string;
}): Promise<ApiResponse<Withdrawal[]>> {
  const qs = filter?.status && filter.status !== "all" ? `?status=${filter.status}` : "";
  return apiRequest<Withdrawal[]>(`/api/withdrawals${qs}`);
}

export async function cancelWithdrawal(id: string): Promise<ApiResponse<{ done: true }>> {
  const res = await apiRequest<{ done: true }>(`/api/withdrawals/${id}/cancel`, {
    method: "POST",
  });
  if (res.ok) bumpApiVersion();
  return res;
}

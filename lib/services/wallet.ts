import { bumpApiVersion } from "@/hooks/use-api";
import { apiRequest, ok } from "@/lib/services/helpers";
import { clearIdempotencyKey, getIdempotencyKey } from "@/lib/services/idempotency";
import type { ApiResponse, PayoutAccount, WalletSummary, WalletType } from "@/lib/types";

export async function getWallets(): Promise<ApiResponse<WalletSummary>> {
  return apiRequest<WalletSummary>("/api/wallets");
}

export interface TransferInput {
  from: WalletType;
  to: WalletType;
  amount: number;
}

export async function transferBetweenWallets(
  input: TransferInput
): Promise<ApiResponse<{ done: true }>> {
  const idempotencyKey = getIdempotencyKey("transfer");
  const res = await apiRequest<{ done: true }>("/api/wallets/transfer", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { "Idempotency-Key": idempotencyKey },
  });
  if (res.ok) {
    clearIdempotencyKey("transfer");
    bumpApiVersion();
  }
  return res;
}

export interface PayoutAccountInput {
  nickname: string;
  phone: string;
}

export async function addPayoutAccount(
  input: PayoutAccountInput
): Promise<ApiResponse<{ done: true }>> {
  const res = await apiRequest<{ done: true }>("/api/payout-accounts", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (res.ok) bumpApiVersion();
  return res;
}

export async function setPrimaryPayoutAccount(id: string): Promise<ApiResponse<{ done: true }>> {
  const res = await apiRequest<{ done: true }>(`/api/payout-accounts/${id}/primary`, {
    method: "POST",
  });
  if (res.ok) bumpApiVersion();
  return res;
}

export async function removePayoutAccount(id: string): Promise<ApiResponse<{ done: true }>> {
  const res = await apiRequest<{ done: true }>(`/api/payout-accounts/${id}`, {
    method: "DELETE",
  });
  if (res.ok) bumpApiVersion();
  return res;
}

export async function renamePayoutAccount(
  id: string,
  nickname: string
): Promise<ApiResponse<{ done: true }>> {
  const res = await apiRequest<{ done: true }>(`/api/payout-accounts/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ nickname }),
  });
  if (res.ok) bumpApiVersion();
  return res;
}

export async function getPayoutAccounts(): Promise<ApiResponse<PayoutAccount[]>> {
  return apiRequest<PayoutAccount[]>("/api/payout-accounts");
}

export { ok as walletOk };

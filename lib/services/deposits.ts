import { bumpApiVersion } from "@/hooks/use-api";
import { apiRequest } from "@/lib/services/helpers";
import type { ApiResponse, Deposit, MpesaQr, MpesaStkRequest, PaymentMethod } from "@/lib/types";
import { clearIdempotencyKey, getIdempotencyKey } from "@/lib/services/idempotency";

export interface InitiateDepositInput {
  amount: number;
  phone: string;
  method?: PaymentMethod;
  providerReference?: string;
  wallet?: "deposit";
}

export interface PaypalCheckoutRef {
  orderId: string;
  approveUrl: string;
  status: string;
}

export async function initiateDeposit(
  input: InitiateDepositInput
): Promise<
  ApiResponse<
    {
      deposit: Deposit;
      stk?: MpesaStkRequest;
      demoNote?: string;
      paypal?: PaypalCheckoutRef;
      verificationNote?: string;
    }
  >
> {
  const res = await apiRequest<{
    deposit: Deposit;
    stk?: MpesaStkRequest;
    demoNote?: string;
    paypal?: PaypalCheckoutRef;
    verificationNote?: string;
  }>("/api/deposits", {
    method: "POST",
    headers: { "Idempotency-Key": getIdempotencyKey("deposit") },
    body: JSON.stringify(input),
  });
  if (res.ok) {
    clearIdempotencyKey("deposit");
    bumpApiVersion();
  } else if (!res.ok && res.code === "previous_attempt_closed") {
    clearIdempotencyKey("deposit");
  }
  return res;
}

export async function capturePaypalDeposit(depositId: string): Promise<ApiResponse<{ done: true; deposit: Deposit }>> {
  const res = await apiRequest<{ done: true; deposit: Deposit }>(
    `/api/deposits/${encodeURIComponent(depositId)}/capture`,
    { method: "POST" }
  );
  if (res.ok) bumpApiVersion();
  return res;
}

export async function getDepositStatus(depositId: string): Promise<ApiResponse<Deposit>> {
  return apiRequest<Deposit>(`/api/deposits/${encodeURIComponent(depositId)}`);
}

export async function getDeposits(limit = 20): Promise<ApiResponse<Deposit[]>> {
  return apiRequest<Deposit[]>(`/api/deposits?limit=${limit}`);
}

export async function cancelDeposit(depositId: string): Promise<ApiResponse<{ done: true }>> {
  const res = await apiRequest<{ done: true }>(
    `/api/deposits/${encodeURIComponent(depositId)}/cancel`,
    { method: "POST" }
  );
  if (res.ok) bumpApiVersion();
  return res;
}

export interface PaymentContact {
  adminName: string;
  adminEmail: string;
  whatsappNumber: string;
  mpesaTillNumber: string;
}

export interface CheckoutConfig {
  contact: PaymentContact;
  enabledMethods: PaymentMethod[];
}

export async function getCheckoutConfig(): Promise<ApiResponse<CheckoutConfig>> {
  return apiRequest<CheckoutConfig>("/api/checkout/config");
}

export async function getPublicPaymentConfig(): Promise<ApiResponse<CheckoutConfig>> {
  return apiRequest<CheckoutConfig>("/api/public/payment-config");
}

export async function getMpesaQr(amount?: number): Promise<ApiResponse<MpesaQr>> {
  const query = amount && amount > 0 ? `?amount=${encodeURIComponent(Math.round(amount))}` : "";
  return apiRequest<MpesaQr>(`/api/payments/mpesa-qr${query}`);
}

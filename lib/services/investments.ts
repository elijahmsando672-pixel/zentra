import { bumpApiVersion } from "@/hooks/use-api";
import { apiRequest, toQuery } from "@/lib/services/helpers";
import type {
  ApiResponse,
  EarningScheduleSummary,
  Investment,
  InvestmentStatus,
} from "@/lib/types";
import { clearIdempotencyKey, getIdempotencyKey } from "@/lib/services/idempotency";

export async function getInvestments(filter?: {
  status?: InvestmentStatus | "all";
  search?: string;
}): Promise<ApiResponse<Investment[]>> {
  return apiRequest<Investment[]>(`/api/investments${toQuery({ ...filter })}`);
}

export async function getInvestmentById(id: string): Promise<ApiResponse<Investment>> {
  return apiRequest<Investment>(`/api/investments/${encodeURIComponent(id)}`);
}

export async function getEarningSchedule(
  investmentId: string
): Promise<ApiResponse<EarningScheduleSummary>> {
  return apiRequest<EarningScheduleSummary>(
    `/api/investments/${encodeURIComponent(investmentId)}/earnings`
  );
}

export interface CreateInvestmentInput {
  productId: string;
  amount: number;
  wallet: "deposit";
}

export async function createInvestment(
  input: CreateInvestmentInput
): Promise<ApiResponse<{ investment: Investment; reference: string }>> {
  const res = await apiRequest<{ investment: Investment; reference: string }>(
    "/api/investments/create",
    { method: "POST", body: JSON.stringify(input), headers: { "Idempotency-Key": getIdempotencyKey("investment") } }
  );
  if (res.ok) {
    clearIdempotencyKey("investment");
    bumpApiVersion();
  }
  return res;
}

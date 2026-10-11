import { apiRequest, toQuery } from "@/lib/services/helpers";
import type {
  ApiResponse,
  Paginated,
  Transaction,
  TransactionFilter,
  TransactionType,
} from "@/lib/types";

export async function getTransactions(
  filter: TransactionFilter = {}
): Promise<ApiResponse<Paginated<Transaction>>> {
  return apiRequest<Paginated<Transaction>>(`/api/transactions${toQuery({ ...filter })}`);
}

export async function getTransactionById(id: string): Promise<ApiResponse<Transaction>> {
  return apiRequest<Transaction>(`/api/transactions/${encodeURIComponent(id)}`);
}

export async function getTransactionCountsByType(): Promise<
  ApiResponse<Record<TransactionType, number>>
> {
  return apiRequest<Record<TransactionType, number>>("/api/transactions/counts");
}

export function transactionsToCsv(items: Transaction[]) {
  return items.map((t) => ({
    Reference: t.reference,
    Type: t.type,
    Description: t.description,
    Status: t.status,
    Amount: t.amount,
    Fee: t.fee,
    Net: t.netAmount,
    Wallet: t.wallet,
    Direction: t.direction,
    Date: new Date(t.createdAt).toISOString(),
  }));
}

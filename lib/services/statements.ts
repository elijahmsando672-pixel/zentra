import { apiRequest, toQuery } from "@/lib/services/helpers";
import type { AccountStatement, ApiResponse, StatementQuery } from "@/lib/types";

export async function getStatement(query: StatementQuery): Promise<ApiResponse<AccountStatement>> {
  return apiRequest<AccountStatement>(`/api/statements${toQuery({ ...query })}`);
}

export function statementExportUrl(query: StatementQuery, format: "csv" | "pdf"): string {
  return `/api/statements/export${toQuery({ ...query, format })}`;
}

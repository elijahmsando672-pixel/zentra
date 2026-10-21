import { NextResponse } from "next/server";
import { fail, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import { buildStatement, parseStatementFilters } from "@/lib/server/statements";
import { statementToCsv, statementToPdf } from "@/lib/server/statement-render";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const params = new URL(req.url).searchParams;
    const format = (params.get("format") ?? "csv").toLowerCase();
    if (format !== "csv" && format !== "pdf") {
      return fail("Choose CSV or PDF format.", "invalid_format");
    }

    const filters = parseStatementFilters(params);
    if ("error" in filters) return fail(filters.error, "invalid_range", { from: filters.error });

    const statement = await buildStatement(user.id, filters);
    if ("error" in statement) return fail(statement.error, "statement_error", undefined, 422);

    const from = filters.from.toISOString().slice(0, 10);
    const to = filters.to.toISOString().slice(0, 10);
    const filename = `zentra-statement-${user.accountNumber}-${from}-to-${to}.${format}`;

    if (format === "csv") {
      const body = statementToCsv(statement);
      return new NextResponse(body, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store, private",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const pdf = statementToPdf(statement);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, private",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return serverError(error);
  }
}

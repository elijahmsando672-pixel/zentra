import { fail, ok, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import { buildStatement, parseStatementFilters } from "@/lib/server/statements";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const params = new URL(req.url).searchParams;
    const filters = parseStatementFilters(params);
    if ("error" in filters) return fail(filters.error, "invalid_range", { from: filters.error });

    const statement = await buildStatement(user.id, filters);
    if ("error" in statement) return fail(statement.error, "statement_error", undefined, 422);

    return ok({
      ...statement,
      previewLimited: false,
    });
  } catch (error) {
    return serverError(error);
  }
}

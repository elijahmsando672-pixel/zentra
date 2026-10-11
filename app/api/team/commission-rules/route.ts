import { prisma } from "@/lib/server/prisma";
import { ok, serverError } from "@/lib/server/api";
import { mapCommissionRule } from "@/lib/server/mappers";

export async function GET() {
  try {
    const items = await prisma.commissionRule.findMany({ orderBy: { level: "asc" } });
    return ok(items.map(mapCommissionRule));
  } catch (error) {
    return serverError(error);
  }
}

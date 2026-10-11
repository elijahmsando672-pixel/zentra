import { prisma } from "@/lib/server/prisma";
import { ok, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const grouped = await prisma.transaction.groupBy({
      by: ["type"],
      where: { userId: user.id },
      _count: { _all: true },
    });

    const counts: Record<string, number> = {};
    for (const g of grouped) counts[g.type] = g._count._all;

    return ok(counts);
  } catch (error) {
    return serverError(error);
  }
}

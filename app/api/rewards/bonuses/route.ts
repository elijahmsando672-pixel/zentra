import { prisma } from "@/lib/server/prisma";
import { ok, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import { mapBonusAward } from "@/lib/server/mappers";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const items = await prisma.bonusAward.findMany({
      where: { ownerId: user.id },
      orderBy: { awardedAt: "desc" },
    });

    return ok(items.map(mapBonusAward));
  } catch (error) {
    return serverError(error);
  }
}

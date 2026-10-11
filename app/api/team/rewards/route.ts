import { prisma } from "@/lib/server/prisma";
import { ok, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import { mapTeamReward } from "@/lib/server/mappers";
import type { RewardStatus } from "@/lib/types";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { searchParams } = new URL(req.url);
    const levelParam = searchParams.get("level");
    const level = levelParam ? Number(levelParam) : undefined;
    const status = searchParams.get("status");

    const items = await prisma.teamReward.findMany({
      where: {
        ownerId: user.id,
        ...(level ? { level } : {}),
        ...(status && status !== "all" ? { status: status as RewardStatus } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(items.map(mapTeamReward));
  } catch (error) {
    return serverError(error);
  }
}

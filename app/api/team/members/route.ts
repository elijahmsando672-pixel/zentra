import { prisma } from "@/lib/server/prisma";
import { ok, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import { mapTeamMember } from "@/lib/server/mappers";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { searchParams } = new URL(req.url);
    const levelParam = searchParams.get("level");
    const level = levelParam ? Number(levelParam) : undefined;

    const items = await prisma.teamMember.findMany({
      where: {
        ownerId: user.id,
        ...(level ? { level } : {}),
      },
      orderBy: { joinedAt: "desc" },
    });

    return ok(items.map(mapTeamMember));
  } catch (error) {
    return serverError(error);
  }
}

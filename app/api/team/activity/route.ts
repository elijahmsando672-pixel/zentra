import { prisma } from "@/lib/server/prisma";
import { ok, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import { mapReferralActivity } from "@/lib/server/mappers";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const items = await prisma.referralActivity.findMany({
      where: { ownerId: user.id },
      orderBy: { at: "desc" },
      take: 20,
    });

    return ok(items.map(mapReferralActivity));
  } catch (error) {
    return serverError(error);
  }
}

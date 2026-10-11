import { prisma } from "@/lib/server/prisma";
import { ok, serverError } from "@/lib/server/api";
import { mapCampaign } from "@/lib/server/mappers";

export async function GET() {
  try {
    const items = await prisma.campaign.findMany({ orderBy: { startsAt: "desc" } });
    return ok(items.map(mapCampaign));
  } catch (error) {
    return serverError(error);
  }
}

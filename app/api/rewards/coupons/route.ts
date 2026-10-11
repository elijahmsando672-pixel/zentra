import { prisma } from "@/lib/server/prisma";
import { ok, serverError } from "@/lib/server/api";
import { mapCoupon } from "@/lib/server/mappers";

export async function GET() {
  try {
    const items = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
    return ok(items.map(mapCoupon));
  } catch (error) {
    return serverError(error);
  }
}

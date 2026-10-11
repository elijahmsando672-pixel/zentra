import { prisma } from "@/lib/server/prisma";
import { ok, serverError } from "@/lib/server/api";
import { mapProduct } from "@/lib/server/mappers";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { featured: true },
      take: 3,
    });
    return ok(products.map(mapProduct));
  } catch (error) {
    return serverError(error);
  }
}

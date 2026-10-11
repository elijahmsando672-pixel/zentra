import { prisma } from "@/lib/server/prisma";
import { ok, notFound, serverError } from "@/lib/server/api";
import { mapProduct } from "@/lib/server/mappers";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const product = await prisma.product.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
    });
    if (!product) return notFound("That product could not be found.");
    return ok(mapProduct(product));
  } catch (error) {
    return serverError(error);
  }
}

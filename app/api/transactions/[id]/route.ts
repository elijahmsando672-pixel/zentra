import { prisma } from "@/lib/server/prisma";
import { ok, notFound, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import { mapTransaction } from "@/lib/server/mappers";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;

    const tx = await prisma.transaction.findFirst({
      where: { userId: user.id, OR: [{ id }, { reference: id }] },
    });
    if (!tx) return notFound("That transaction could not be found.");
    return ok(mapTransaction(tx));
  } catch (error) {
    return serverError(error);
  }
}

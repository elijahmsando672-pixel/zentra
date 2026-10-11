import { prisma } from "@/lib/server/prisma";
import { ok, notFound, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import { mapInvestment } from "@/lib/server/mappers";
import { runDueJobs } from "@/lib/server/engine";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    await runDueJobs(user.id);

    const inv = await prisma.investment.findFirst({
      where: { userId: user.id, OR: [{ id }, { reference: id }] },
      include: { product: true },
    });
    if (!inv) return notFound("That investment could not be found.");
    return ok(mapInvestment(inv));
  } catch (error) {
    return serverError(error);
  }
}

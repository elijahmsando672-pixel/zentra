import { prisma } from "@/lib/server/prisma";
import { ok, fail, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;

    const account = await prisma.payoutAccount.findFirst({ where: { id, userId: user.id } });
    if (!account) return fail("Payout account not found.", "not_found");

    await prisma.$transaction([
      prisma.payoutAccount.updateMany({
        where: { userId: user.id },
        data: { isPrimary: false },
      }),
      prisma.payoutAccount.update({ where: { id }, data: { isPrimary: true } }),
    ]);

    return ok({ done: true as const });
  } catch (error) {
    return serverError(error);
  }
}

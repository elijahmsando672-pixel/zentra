import { prisma } from "@/lib/server/prisma";
import { ok, fail, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;

    const bonus = await prisma.bonusAward.findFirst({ where: { id, ownerId: user.id } });
    if (!bonus) return fail("Bonus not found.", "not_found");
    if (bonus.status !== "pending") return fail("This bonus cannot be claimed.", "not_claimable");

    await prisma.$transaction([
      prisma.bonusAward.update({ where: { id: bonus.id }, data: { status: "claimed" } }),
      prisma.wallet.upsert({
        where: { userId_wallet: { userId: user.id, wallet: bonus.wallet } },
        update: { balance: { increment: Number(bonus.amount) } },
        create: { userId: user.id, wallet: bonus.wallet, balance: Number(bonus.amount) },
      }),
    ]);

    return ok({ done: true as const });
  } catch (error) {
    return serverError(error);
  }
}

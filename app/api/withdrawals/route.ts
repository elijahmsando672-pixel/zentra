import { prisma } from "@/lib/server/prisma";
import { ok, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import { mapWithdrawal } from "@/lib/server/mappers";
import { runDueJobs } from "@/lib/server/engine";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    await runDueJobs(user.id);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const Where = status && status !== "all" ? { userId: user.id, status: status as never } : { userId: user.id };

    const items = await prisma.withdrawal.findMany({
      where: Where,
      include: {
        payoutAccount: true,
        user: { select: { id: true, fullName: true, accountNumber: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(items.map(mapWithdrawal));
  } catch (error) {
    return serverError(error);
  }
}

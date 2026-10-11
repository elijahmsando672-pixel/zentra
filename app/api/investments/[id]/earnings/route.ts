import { prisma } from "@/lib/server/prisma";
import { ok, fail, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import { runDueJobs } from "@/lib/server/engine";

const round2 = (n: number) => Number(n.toFixed(2));

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
    });
    if (!inv) return fail("No earning schedule found for this investment.", "not_found");

    const entries = await prisma.earningEntry.findMany({
      where: { investmentId: inv.id },
      orderBy: { day: "asc" },
    });

    const items = entries.map((e) => ({
      id: e.id,
      investmentId: e.investmentId,
      day: e.day,
      date: e.date.toISOString(),
      amount: Number(e.amount),
      status: e.status,
      creditedAt: e.creditedAt?.toISOString(),
    }));

    const totalCredited = items
      .filter((i) => i.status === "credited")
      .reduce((s, i) => s + i.amount, 0);
    const totalScheduled = items.reduce((s, i) => s + i.amount, 0);

    return ok({
      items,
      totalCredited: round2(totalCredited),
      totalScheduled: round2(totalScheduled),
    });
  } catch (error) {
    return serverError(error);
  }
}

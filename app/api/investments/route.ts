import { prisma } from "@/lib/server/prisma";
import { ok, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import { mapInvestment } from "@/lib/server/mappers";
import { runDueJobs } from "@/lib/server/engine";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    await runDueJobs(user.id);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.toLowerCase() ?? "";

    const items = await prisma.investment.findMany({
      where: {
        userId: user.id,
        ...(status && status !== "all" ? { status: status as never } : {}),
      },
      include: { product: true },
      orderBy: { startDate: "desc" },
    });

    let mapped = items.map(mapInvestment);
    if (search) {
      mapped = mapped.filter(
        (i) =>
          i.reference.toLowerCase().includes(search) ||
          i.product.name.toLowerCase().includes(search)
      );
    }

    return ok(mapped);
  } catch (error) {
    return serverError(error);
  }
}

import { prisma } from "@/lib/server/prisma";
import { ok, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import { mapWallets } from "@/lib/server/mappers";
import { runDueJobs } from "@/lib/server/engine";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    await runDueJobs(user.id);
    const rows = await prisma.wallet.findMany({ where: { userId: user.id } });
    return ok(mapWallets(rows));
  } catch (error) {
    return serverError(error);
  }
}

import { prisma } from "@/lib/server/prisma";
import { ok, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import { maskEmail, maskPhone } from "@/lib/utils";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const [totalInvestments, totalTransactions] = await Promise.all([
      prisma.investment.count({ where: { userId: user.id } }),
      prisma.transaction.count({ where: { userId: user.id } }),
    ]);

    return ok({
      joinedAt: user.joinedAt.toISOString(),
      lastLoginAt: user.lastLoginAt.toISOString(),
      lastLoginIp: user.lastLoginIp,
      device: user.device,
      maskedPhone: maskPhone(user.phone),
      maskedEmail: maskEmail(user.email),
      totalInvestments,
      totalTransactions,
      openTickets: 0,
    });
  } catch (error) {
    return serverError(error);
  }
}

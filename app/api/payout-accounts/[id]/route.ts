import { prisma } from "@/lib/server/prisma";
import { fail, ok, readJson, serverError, unauthorized } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const body = await readJson(req);

    const account = await prisma.payoutAccount.findFirst({ where: { id, userId: user.id } });
    if (!account) return fail("Payout account not found.", "not_found");

    const nickname = String(body.nickname ?? "").trim();
    if (!nickname) return fail("Give this account a nickname.", "invalid", { nickname: "Required." });

    await prisma.payoutAccount.update({ where: { id }, data: { nickname } });
    return ok({ done: true as const });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await params;

    const account = await prisma.payoutAccount.findFirst({ where: { id, userId: user.id } });
    if (!account) return fail("Payout account not found.", "not_found");

    await prisma.payoutAccount.delete({ where: { id } });

    if (account.isPrimary) {
      const next = await prisma.payoutAccount.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
      });
      if (next) {
        await prisma.payoutAccount.update({ where: { id: next.id }, data: { isPrimary: true } });
      }
    }

    return ok({ done: true as const });
  } catch (error) {
    return serverError(error);
  }
}

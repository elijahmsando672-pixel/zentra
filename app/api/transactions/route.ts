import { prisma } from "@/lib/server/prisma";
import { ok, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import { mapTransaction } from "@/lib/server/mappers";
import { runDueJobs } from "@/lib/server/engine";
import type { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    await runDueJobs(user.id);

    const { searchParams } = new URL(req.url);
    const list = (key: string) =>
      searchParams.get(key)?.split(",").filter(Boolean) ?? [];

    const where: Prisma.TransactionWhereInput = { userId: user.id };

    const types = list("types");
    if (types.length) where.type = { in: types as never };
    const statuses = list("statuses");
    if (statuses.length) where.status = { in: statuses as never };
    const wallets = list("wallets");
    if (wallets.length) where.wallet = { in: wallets as never };

    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }
    const search = searchParams.get("search")?.toLowerCase();
    if (search) {
      where.OR = [
        { reference: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { counterparty: { contains: search, mode: "insensitive" } },
      ];
    }
    const minAmount = searchParams.get("minAmount");
    const maxAmount = searchParams.get("maxAmount");
    if (minAmount || maxAmount) {
      where.amount = {
        ...(minAmount ? { gte: Number(minAmount) } : {}),
        ...(maxAmount ? { lte: Number(maxAmount) } : {}),
      };
    }

    const page = Number(searchParams.get("page") ?? 1);
    const pageSize = Number(searchParams.get("pageSize") ?? 12);

    const [rows, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.transaction.count({ where }),
    ]);

    return ok({
      items: rows.map(mapTransaction),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    });
  } catch (error) {
    return serverError(error);
  }
}

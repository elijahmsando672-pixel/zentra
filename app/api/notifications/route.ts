import { prisma } from "@/lib/server/prisma";
import { ok, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import { mapNotification } from "@/lib/server/mappers";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const category = searchParams.get("category");

    const items = await prisma.notification.findMany({
      where: {
        userId: user.id,
        ...(unreadOnly ? { read: false } : {}),
        ...(category && category !== "all" ? { category: category as never } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(items.map(mapNotification));
  } catch (error) {
    return serverError(error);
  }
}

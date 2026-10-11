import { prisma } from "@/lib/server/prisma";
import { ok, serverError } from "@/lib/server/api";
import { mapProduct } from "@/lib/server/mappers";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase() ?? "";
    const tier = searchParams.get("tier") ?? "all";
    const status = searchParams.get("status") ?? "all";
    const featured = searchParams.get("featured") === "true";
    const minEntry = searchParams.get("minEntry") ? Number(searchParams.get("minEntry")) : undefined;
    const maxDuration = searchParams.get("maxDuration")
      ? Number(searchParams.get("maxDuration"))
      : undefined;
    const sort = searchParams.get("sort") ?? "recommended";
    const page = Number(searchParams.get("page") ?? 1);
    const pageSize = Number(searchParams.get("pageSize") ?? 12);

    let items = (await prisma.product.findMany()).map(mapProduct);

    if (search) {
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.tagline.toLowerCase().includes(search) ||
          p.description.toLowerCase().includes(search)
      );
    }
    if (tier !== "all") items = items.filter((p) => p.tier === tier);
    if (status !== "all") items = items.filter((p) => p.status === status);
    if (featured) items = items.filter((p) => p.featured);
    if (minEntry !== undefined) items = items.filter((p) => p.minEntry <= minEntry);
    if (maxDuration !== undefined) items = items.filter((p) => p.durationDays <= maxDuration);

    switch (sort) {
      case "entry_asc":
        items.sort((a, b) => a.minEntry - b.minEntry);
        break;
      case "entry_desc":
        items.sort((a, b) => b.minEntry - a.minEntry);
        break;
      case "duration_asc":
        items.sort((a, b) => a.durationDays - b.durationDays);
        break;
      case "duration_desc":
        items.sort((a, b) => b.durationDays - a.durationDays);
        break;
      case "newest":
        items.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
        break;
      default:
        items.sort(
          (a, b) => Number(b.featured) - Number(a.featured) || b.dailyRate - a.dailyRate
        );
    }

    const start = (page - 1) * pageSize;
    const slice = items.slice(start, start + pageSize);

    return ok({
      items: slice,
      total: items.length,
      page,
      pageSize,
      hasMore: start + pageSize < items.length,
    });
  } catch (error) {
    return serverError(error);
  }
}

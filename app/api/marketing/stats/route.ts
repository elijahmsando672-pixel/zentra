import { ok, serverError } from "@/lib/server/api";

export async function GET() {
  try {
    return ok({
      activeMembers: 48_320,
      productsAvailable: 6,
      rewardsTracked: 128_400_000,
      transactionsProcessed: 2_847_113,
    });
  } catch (error) {
    return serverError(error);
  }
}

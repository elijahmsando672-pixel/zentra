import { ok, serverError } from "@/lib/server/api";
import { getPaymentConfig } from "@/lib/server/payments";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getPaymentConfig();
    return ok(config);
  } catch (error) {
    return serverError(error);
  }
}

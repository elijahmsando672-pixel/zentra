import { ok, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import { getPaymentConfig } from "@/lib/server/payments";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const config = await getPaymentConfig();
    return ok(config);
  } catch (error) {
    return serverError(error);
  }
}
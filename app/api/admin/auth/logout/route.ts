import { ok, serverError } from "@/lib/server/api";
import { destroyAdminSession } from "@/lib/server/admin-session";

export async function POST() {
  try {
    await destroyAdminSession();
    return ok({ done: true as const });
  } catch (error) {
    return serverError(error);
  }
}

import { ok, serverError } from "@/lib/server/api";
import { destroyCurrentSession } from "@/lib/server/session";

export async function POST() {
  try {
    await destroyCurrentSession();
    return ok({ done: true as const });
  } catch (error) {
    return serverError(error);
  }
}

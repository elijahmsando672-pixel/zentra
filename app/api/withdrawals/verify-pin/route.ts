import bcrypt from "bcryptjs";
import { ok, fail, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import { DEMO_TRANSACTION_PIN } from "@/lib/constants";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const body = await req.json();
    const pin = String(body.pin ?? "");

    const valid =
      user.hasTransactionPin && user.transactionPinHash
        ? await bcrypt.compare(pin, user.transactionPinHash)
        : pin === DEMO_TRANSACTION_PIN;

    if (!valid) {
      return fail("That PIN is not correct. Please try again.", "bad_pin", { pin: "Incorrect PIN." });
    }
    return ok({ verified: true as const });
  } catch (error) {
    return serverError(error);
  }
}

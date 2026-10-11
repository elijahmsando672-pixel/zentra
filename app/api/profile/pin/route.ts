import bcrypt from "bcryptjs";
import { prisma } from "@/lib/server/prisma";
import { ok, fail, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const body = await req.json();
    const newPin = String(body.newPin ?? "");
    const currentPin = body.currentPin ? String(body.currentPin) : undefined;

    if (user.hasTransactionPin && user.transactionPinHash) {
      const valid = currentPin
        ? await bcrypt.compare(currentPin, user.transactionPinHash)
        : false;
      if (!valid) {
        return fail("Your current PIN is incorrect.", "bad_pin", { currentPin: "Incorrect PIN." });
      }
    }

    if (!/^\d{4}$/.test(newPin)) {
      return fail("PIN must be exactly 4 digits.", "invalid_pin", { newPin: "4 digits." });
    }

    const transactionPinHash = await bcrypt.hash(newPin, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { hasTransactionPin: true, transactionPinHash },
    });

    return ok({ done: true as const });
  } catch (error) {
    return serverError(error);
  }
}

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/server/prisma";
import { fail, ok, readJson, serverError } from "@/lib/server/api";
import { normalizePhoneKE } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const raw = String(body.target ?? "").trim();
    const newPassword = String(body.newPassword ?? "");
    const key = raw.includes("@") ? raw.toLowerCase() : normalizePhoneKE(raw);

    if (newPassword.length < 8) {
      return fail("Password must be at least 8 characters.", "weak_password", {
        password: "Use at least 8 characters.",
      });
    }

    const user = await prisma.user.findFirst({
      where: { OR: [{ phone: key }, { email: key }] },
    });

    if (user) {
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, lastLoginAt: new Date() },
      });
      await prisma.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return ok({ done: true as const });
  } catch (error) {
    return serverError(error);
  }
}

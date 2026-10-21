import bcrypt from "bcryptjs";
import { prisma } from "@/lib/server/prisma";
import { fail, ok, readJson, serverError, unauthorized } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const body = await readJson(req);
    const current = String(body.current ?? "");
    const next = String(body.next ?? "");

    if (next.length < 8) {
      return fail("New password must be at least 8 characters.", "weak", {
        next: "Use 8+ characters.",
      });
    }

    const valid = await bcrypt.compare(current, user.passwordHash);
    if (!valid) return fail("Current password is incorrect.", "bad_current");

    const passwordHash = await bcrypt.hash(next, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    await prisma.notification.create({
      data: {
        userId: user.id,
        category: "security",
        title: "Password changed",
        message:
          "Your account password was updated. Reset it immediately if this was not you.",
        actionUrl: "/profile/security",
        actionLabel: "Security centre",
      },
    });

    return ok({ done: true as const });
  } catch (error) {
    return serverError(error);
  }
}

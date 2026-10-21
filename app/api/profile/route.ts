import { prisma } from "@/lib/server/prisma";
import { fail, ok, readJson, serverError, unauthorized } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import { mapUser } from "@/lib/server/mappers";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    return ok(mapUser(user));
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const body = await readJson(req);

    const data: Record<string, unknown> = {};
    if (typeof body.fullName === "string" && body.fullName.trim()) {
      data.fullName = body.fullName.trim();
    }
    if (typeof body.email === "string" && body.email.trim()) {
      const email = body.email.trim().toLowerCase();
      const clash = await prisma.user.findFirst({
        where: { email, NOT: { id: user.id } },
      });
      if (clash) {
        return fail("That email is already in use.", "duplicate_email", {
          email: "Already in use.",
        });
      }
      data.email = email;
      data.emailVerified = false;
    }
    if (body.notificationPreferences && typeof body.notificationPreferences === "object") {
      data.notificationPreferences = {
        ...(user.notificationPreferences as Record<string, boolean>),
        ...body.notificationPreferences,
      };
    }
    data.profileCompletion = Math.min(100, user.profileCompletion + 3);

    const updated = await prisma.user.update({ where: { id: user.id }, data });
    return ok(mapUser(updated));
  } catch (error) {
    return serverError(error);
  }
}

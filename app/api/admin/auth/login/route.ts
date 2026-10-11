import bcrypt from "bcryptjs";
import { prisma } from "@/lib/server/prisma";
import { fail, ok, serverError } from "@/lib/server/api";
import { createAdminSession } from "@/lib/server/admin-session";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const staff = await prisma.adminStaff.findUnique({ where: { email } });
    if (!staff || !staff.passwordHash || !(await bcrypt.compare(password, staff.passwordHash))) {
      return fail("Invalid staff credentials.", "bad_credentials", undefined, 401);
    }
    if (staff.status !== "active") return fail("This staff account is not active. Contact an administrator.", "inactive", undefined, 403);
    await createAdminSession(staff.id);
    await prisma.adminStaff.update({ where: { id: staff.id }, data: { lastActiveAt: new Date() } });
    return ok({ ok: true as const, staffName: staff.fullName });
  } catch (error) {
    return serverError(error);
  }
}

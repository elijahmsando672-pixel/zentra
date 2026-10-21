import { ok, serverError } from "@/lib/server/api";
import { destroyAdminSession, getAdminStaff } from "@/lib/server/admin-session";
import { prisma } from "@/lib/server/prisma";
import { requestIp } from "@/lib/server/rate-limit";

export async function POST(req: Request) {
  try {
    const staff = await getAdminStaff();
    await destroyAdminSession();
    if (staff) {
      await prisma.auditLog.create({
        data: {
          actor: staff.fullName,
          actorRole: staff.role,
          action: "admin.logout",
          entityType: "admin_staff",
          entityId: staff.id,
          reason: "Staff signed out.",
          oldValue: null,
          newValue: null,
          ip: requestIp(req),
        },
      });
    }
    return ok({ done: true as const });
  } catch (error) {
    return serverError(error);
  }
}

import { ok, serverError } from "@/lib/server/api";
import { getAuth } from "@/lib/server/session";
import { mapUser } from "@/lib/server/mappers";
import { getAdminStaff } from "@/lib/server/admin-session";

export async function GET() {
  try {
    const session = await getAuth();
    if (!session) {
      const staff = await getAdminStaff();
      return ok({ authed: false, adminAuthed: !!staff, user: null, staffName: staff?.fullName ?? null });
    }
    const staff = await getAdminStaff();
    return ok({ authed: true, adminAuthed: !!staff, user: mapUser(session.user), staffName: staff?.fullName ?? null });
  } catch (error) {
    return serverError(error);
  }
}

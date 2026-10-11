import type { ReactNode } from "react";
import { AdminShell } from "@/components/layout/admin-shell";
import { redirect } from "next/navigation";
import { getAdminStaff } from "@/lib/server/admin-session";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!(await getAdminStaff())) redirect("/admin/login");
  return <AdminShell>{children}</AdminShell>;
}

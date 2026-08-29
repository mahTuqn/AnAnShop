import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";

export async function GuardedAdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
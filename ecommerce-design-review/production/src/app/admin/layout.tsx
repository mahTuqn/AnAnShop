import type { ReactNode } from "react";
import { GuardedAdminLayout } from "@/components/admin/guarded-admin-layout";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  return <GuardedAdminLayout>{children}</GuardedAdminLayout>;
}

import { requireAdminPageSession } from "@/lib/admin/page-guard";
import { AdminDashboard } from "@/components/admin/dashboard";
export default async function Page() { await requireAdminPageSession("/admin", "reports.read"); return <AdminDashboard />; }

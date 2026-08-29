import { requireAdminPageSession } from "@/lib/admin/page-guard";
﻿import { AdminResourcePageV3 as AdminResourcePage } from "@/components/admin/resource-page-v3";
import { adminResources } from "@/lib/admin/admin-data";
export default async function Page() { await requireAdminPageSession("/admin/audit", "audit.read"); return <AdminResourcePage resource={adminResources.audit} resourceKey="audit" />; }


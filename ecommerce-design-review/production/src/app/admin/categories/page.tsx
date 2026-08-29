import { requireAdminPageSession } from "@/lib/admin/page-guard";
﻿import { PersistentAdminResourcePage as AdminResourcePage } from "@/components/admin/persistent-resource-page";
import { adminResources } from "@/lib/admin/admin-data";
export default async function Page() { await requireAdminPageSession("/admin/categories", "products.write"); return <AdminResourcePage resource={adminResources.categories} resourceKey="categories" />; }


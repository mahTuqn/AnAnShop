import { requireAdminPageSession } from "@/lib/admin/page-guard";
﻿import { PersistentAdminResourcePage as AdminResourcePage } from "@/components/admin/persistent-resource-page";
import { adminResources } from "@/lib/admin/admin-data";
export default async function Page() { await requireAdminPageSession("/admin/reviews", "reviews.read"); return <AdminResourcePage resource={adminResources.reviews} resourceKey="reviews" />; }


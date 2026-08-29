import { requireAdminPageSession } from "@/lib/admin/page-guard";
import { ReturnsPageClient } from "@/components/admin/returns-page-client";
export default async function Page(){await requireAdminPageSession("/admin/returns","orders.write");return <ReturnsPageClient/>;}
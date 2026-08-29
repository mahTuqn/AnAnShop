import { requireAdminPageSession } from "@/lib/admin/page-guard";
import { SettingsPage } from "@/components/admin/settings-page";
export default async function Page() { await requireAdminPageSession("/admin/settings", "settings.write"); return <SettingsPage />; }

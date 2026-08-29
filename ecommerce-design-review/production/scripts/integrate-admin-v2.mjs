import fs from "node:fs";

const edit = (file, transform) => fs.writeFileSync(file, transform(fs.readFileSync(file, "utf8")), "utf8");
const exact = (source, before, after, label) => {
  if (!source.includes(before)) throw new Error(`Missing ${label}`);
  return source.replace(before, after);
};

edit("production/src/app/admin/layout.tsx", (source) => {
  source = exact(source, 'import { AdminShell } from "@/components/admin/admin-shell";', 'import { GuardedAdminLayout } from "@/components/admin/guarded-admin-layout";', "admin guarded import");
  source = exact(source, "export default function AdminLayout", "export default async function AdminLayout", "async admin layout");
  return exact(source, "return <AdminShell>{children}</AdminShell>;", "return <GuardedAdminLayout>{children}</GuardedAdminLayout>;", "guarded admin render");
});

for (const file of fs.readdirSync("production/src/app/admin", { recursive: true }).filter((name) => name.endsWith("page.tsx"))) {
  const path = `production/src/app/admin/${file.replaceAll("\\", "/")}`;
  edit(path, (source) => source
    .replaceAll('import { AdminResourcePage } from "@/components/admin/resource-page";', 'import { AdminResourcePageV2 as AdminResourcePage } from "@/components/admin/resource-page-v2";')
    .replaceAll('import { ReportsPage } from "@/components/admin/reports-page";', 'import { ReportsPageV2 as ReportsPage } from "@/components/admin/reports-page-v2";'));
}

console.log("Admin guard and accessible V2 pages integrated.");

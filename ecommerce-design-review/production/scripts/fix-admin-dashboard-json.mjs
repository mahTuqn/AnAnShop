import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const file = resolve(import.meta.dirname, "..", "src", "app", "api", "admin", "dashboard", "route.ts");
let source = readFileSync(file, "utf8");
source = source.replace(
  'import { adminRoute } from "@/lib/server/admin";',
  'import { adminRoute } from "@/lib/server/admin";\nimport { serializeDashboardSummary, type DashboardSummaryRow } from "@/lib/admin/dashboard-summary";',
);
source = source.replace(
  'const [summary] = await db.$queryRawUnsafe<Array<Record<string, bigint | string>>>(`SELECT',
  'const [summary] = await db.$queryRawUnsafe<DashboardSummaryRow[]>(`SELECT',
);
source = source.replace('return { data: summary };', 'return { data: serializeDashboardSummary(summary) };');
writeFileSync(file, source, "utf8");
console.log("Admin dashboard summary is now JSON-safe.");

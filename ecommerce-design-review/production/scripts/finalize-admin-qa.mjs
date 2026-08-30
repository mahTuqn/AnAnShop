import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const production = resolve(import.meta.dirname, "..");
const root = resolve(production, "..");

function update(file, mutate) {
  const source = readFileSync(file, "utf8");
  const result = mutate(source);
  if (result === source) throw new Error(`No change produced for ${file}`);
  writeFileSync(file, result, "utf8");
}

update(resolve(production, "playwright.config.ts"), (source) => {
  let next = source.replace(
    'import { defineConfig, devices } from "@playwright/test";\n\nexport default defineConfig({',
    'import { defineConfig, devices } from "@playwright/test";\n\nconst port = Number(process.env.PLAYWRIGHT_PORT ?? 3000);\nconst baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;\n\nexport default defineConfig({',
  );
  next = next.replace('baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",', 'baseURL,');
  next = next.replace('command: "npm run dev",\n    url: "http://localhost:3000",', 'command: `npm run dev -- --hostname localhost --port ${port}`,\n    url: baseURL,');
  return next;
});

update(resolve(production, "src", "lib", "admin", "page-guard.ts"), (source) => source
  .replace('export async function requireAdminPageSession(callbackPath = "/admin"): Promise<void> {', 'export async function requireAdminPageSession(callbackPath = "/admin", permission?: string): Promise<void> {')
  .replace(
    'const rows = await getPrisma().$queryRawUnsafe<Array<{ role_code: string }>>(\n      `SELECT DISTINCT r.code AS role_code FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=$1::uuid`,',
    'const rows = await getPrisma().$queryRawUnsafe<Array<{ role_code: string; permission_code: string | null }>>(\n      `SELECT DISTINCT r.code AS role_code, p.code AS permission_code\n         FROM user_roles ur JOIN roles r ON r.id=ur.role_id\n         LEFT JOIN role_permissions rp ON rp.role_id=r.id\n         LEFT JOIN permissions p ON p.id=rp.permission_id\n        WHERE ur.user_id=$1::uuid`,',
  )
  .replace(
    'if (!rows.some(({ role_code }) => role_code === "ADMIN" || role_code === "STAFF")) redirect("/forbidden");',
    'const isAdmin = rows.some(({ role_code }) => role_code === "ADMIN");\n    const isStaff = rows.some(({ role_code }) => role_code === "STAFF");\n    if (!isAdmin && !isStaff) redirect("/forbidden");\n    if (permission && !isAdmin && !rows.some(({ permission_code }) => permission_code === permission)) redirect("/forbidden");',
  ));

const permissions = {
  "page.tsx": ["/admin", "reports.read"],
  "orders/page.tsx": ["/admin/orders", "orders.read"],
  "products/page.tsx": ["/admin/products", "products.read"],
  "categories/page.tsx": ["/admin/categories", "products.write"],
  "inventory/page.tsx": ["/admin/inventory", "inventory.read"],
  "customers/page.tsx": ["/admin/customers", "customers.read"],
  "promotions/page.tsx": ["/admin/promotions", "promotions.read"],
  "returns/page.tsx": ["/admin/returns", "orders.write"],
  "reviews/page.tsx": ["/admin/reviews", "reviews.read"],
  "content/page.tsx": ["/admin/content", "products.write"],
  "staff/page.tsx": ["/admin/staff", "staff.write"],
  "access/page.tsx": ["/admin/access", "staff.write"],
  "reports/page.tsx": ["/admin/reports", "reports.read"],
  "settings/page.tsx": ["/admin/settings", "settings.write"],
  "audit/page.tsx": ["/admin/audit", "audit.read"],
};

for (const [relative, [callbackPath, permission]] of Object.entries(permissions)) {
  update(resolve(production, "src", "app", "admin", relative), (source) => {
    let next = 'import { requireAdminPageSession } from "@/lib/admin/page-guard";\n' + source;
    next = next.replace("export default function Page() { return", `export default async function Page() { await requireAdminPageSession("${callbackPath}", "${permission}"); return`);
    return next;
  });
}

update(resolve(production, "src", "app", "admin", "products", "[id]", "page.tsx"), (source) => source
  .replace('import { ProductEditor } from "@/components/admin/product-editor";', 'import { ProductEditor } from "@/components/admin/product-editor";\nimport { requireAdminPageSession } from "@/lib/admin/page-guard";')
  .replace('  const { id } = await params;', '  await requireAdminPageSession("/admin/products", "products.write");\n  const { id } = await params;'));

update(resolve(root, ".github", "workflows", "quality.yml"), (source) => {
  let next = source.replace(
    '      - run: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f ../database/migrations/0004_audit_permission.sql\n      - run: npm run typecheck',
    '      - run: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f ../database/migrations/0004_audit_permission.sql\n      - run: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f ../database/seed.sql\n      - run: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f ../database/demo-catalog.seed.sql\n      - run: npm run typecheck',
  );
  next += [
    "",
    "  legacy-compile:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - uses: actions/checkout@v4",
    "      - uses: actions/setup-node@v4",
    "        with:",
    "          node-version: 24",
    "          cache: npm",
    "      - name: Compile UX prototype (not deployable)",
    "        run: npm ci && npm run build",
    "      - name: Compile frozen Express backend (not deployable)",
    "        working-directory: server",
    "        run: npm ci && npm run build",
    "",
  ].join("\n");
  return next;
});

console.log("Finalized admin permission guards, isolated Playwright ports, database seed CI and legacy compile gates.");

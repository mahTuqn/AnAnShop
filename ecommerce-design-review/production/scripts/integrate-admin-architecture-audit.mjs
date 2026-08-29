import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const production = resolve(import.meta.dirname, "..");
const root = resolve(production, "..");

function replaceExact(file, before, after) {
  const source = readFileSync(file, "utf8");
  if (!source.includes(before)) throw new Error(`Expected text not found in ${file}`);
  writeFileSync(file, source.replace(before, after), "utf8");
}

for (const route of ["returns", "staff", "access"]) {
  replaceExact(
    resolve(production, "src", "app", "admin", route, "page.tsx"),
    'import { P0OperationsPage } from "@/components/admin/p0-operations-page";\nexport default function Page() { return <P0OperationsPage kind="' + route + '" />; }',
    'import { P0OperationsPageV2 } from "@/components/admin/p0-operations-page-v2";\nexport default function Page() { return <P0OperationsPageV2 kind="' + route + '" />; }',
  );
}

replaceExact(
  resolve(production, "src", "lib", "server", "admin.ts"),
  [
    '  const authorization = request.headers.get("authorization");',
    '  if (!authorization?.startsWith("Bearer ")) throw new AppError("UNAUTHORIZED", "Yêu cầu đăng nhập quản trị", 401);',
    '  const runtime = await getRuntime();',
    '  const session = await runtime.store.resolveSession(authorization.slice(7));',
  ].join("\n"),
  [
    '  const authorization = request.headers.get("authorization");',
    '  if (authorization && !authorization.startsWith("Bearer ")) throw new AppError("UNAUTHORIZED", "Header xác thực không hợp lệ", 401);',
    '  const token = authorization?.slice(7) || request.cookies.get("anan_session")?.value || request.cookies.get("anan_admin_session")?.value;',
    '  if (!token) throw new AppError("UNAUTHORIZED", "Yêu cầu đăng nhập quản trị", 401);',
    '  const runtime = await getRuntime();',
    '  const session = await runtime.store.resolveSession(token);',
  ].join("\n"),
);

replaceExact(
  resolve(root, "server", "lib", "jwt.ts"),
  'const JWT_SECRET = process.env.JWT_SECRET ?? "anan_dev_secret_change_in_production";\nconst JWT_EXPIRES = "7d";',
  [
    'const JWT_SECRET = process.env.JWT_SECRET;',
    'const JWT_EXPIRES = "7d";',
    '',
    'if (!JWT_SECRET || JWT_SECRET.length < 32) {',
    '  throw new Error("JWT_SECRET must be configured with at least 32 characters");',
    '}',
  ].join("\n"),
);

const readme = [
  "# An An Shop",
  "",
  "Ứng dụng triển khai chính thức nằm trong `production/` và sử dụng Next.js, React, TypeScript, PostgreSQL/Prisma. Hãy bắt đầu tại `production/README.md`.",
  "",
  "## Chạy ứng dụng chính",
  "",
  "```powershell",
  "cd production",
  "Copy-Item .env.example .env",
  "docker compose up -d",
  "npm ci",
  "npm run db:generate",
  "npm run dev",
  "```",
  "",
  "Mở `http://localhost:3000`. PostgreSQL của dự án được ánh xạ tại `localhost:5433` để tránh xung đột với PostgreSQL cục bộ hoặc stack khác.",
  "",
  "## Kiểm tra chất lượng",
  "",
  "```powershell",
  "cd production",
  "npm run typecheck",
  "npm test",
  "npm run build",
  "npm run test:e2e",
  "```",
  "",
  "## Mã nguồn tham chiếu",
  "",
  "- `src/`: prototype Figma Make, chỉ dùng đối chiếu UX/UI.",
  "- `server/`: backend Express legacy đã đóng băng, không triển khai.",
  "- `database/`: baseline schema, migrations và seed dùng chung.",
  "- `docs/`: sơ đồ, traceability, test plan và release evidence.",
  "",
  "Không dùng tài khoản demo, secret mẫu hoặc backend legacy ở production. Xem `docs/architecture-source-of-truth.md` để biết ranh giới kiến trúc và lộ trình lưu trữ mã cũ.",
  "",
].join("\n");
writeFileSync(resolve(root, "README.md"), readme, "utf8");

const workflowPath = resolve(root, ".github", "workflows", "quality.yml");
let workflow = readFileSync(workflowPath, "utf8");
workflow = workflow.replace(
  "  production:\n    runs-on: ubuntu-latest",
  [
    "  production:",
    "    runs-on: ubuntu-latest",
    "    services:",
    "      postgres:",
    "        image: postgres:17-alpine",
    "        env:",
    "          POSTGRES_USER: postgres",
    "          POSTGRES_PASSWORD: postgres",
    "          POSTGRES_DB: anan_shop",
    "        ports:",
    "          - 5432:5432",
    "        options: >-",
    "          --health-cmd=\"pg_isready -U postgres -d anan_shop\"",
    "          --health-interval=10s",
    "          --health-timeout=5s",
    "          --health-retries=5",
  ].join("\n"),
);
workflow = workflow.replace(
  '      ADMIN_DEMO_MODE: "true"',
  '      ADMIN_DEMO_MODE: "true"\n      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/anan_shop?schema=public',
);
workflow = workflow.replace(
  "      - run: npm run typecheck",
  [
    "      - run: npx prisma validate",
    "      - run: npx prisma generate",
    "      - run: psql \"$DATABASE_URL\" -v ON_ERROR_STOP=1 -f ../database/schema.sql",
    "      - run: psql \"$DATABASE_URL\" -v ON_ERROR_STOP=1 -f ../database/migrations/0002_checkout_inventory_functions.sql",
    "      - run: psql \"$DATABASE_URL\" -v ON_ERROR_STOP=1 -f ../database/migrations/0003_store_settings_and_refund_idempotency.sql",
    "      - run: psql \"$DATABASE_URL\" -v ON_ERROR_STOP=1 -f ../database/migrations/0004_audit_permission.sql",
    "      - run: npm run typecheck",
  ].join("\n"),
);
writeFileSync(workflowPath, workflow, "utf8");

console.log("Integrated admin accessibility, cookie auth, canonical architecture and CI gates.");

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
function edit(relativePath, transform) {
  const path = resolve(root, relativePath);
  const before = readFileSync(path, "utf8");
  const after = transform(before);
  if (after === before) throw new Error(`No persistence change applied to ${relativePath}`);
  writeFileSync(path, after, "utf8");
  process.stdout.write(`activated ${relativePath}\n`);
}
function exact(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`Missing ${label}`);
  return source.replace(from, to);
}

const runtimeConsumers = [
  "production/src/lib/server/http.ts",
  "production/src/app/api/products/route.ts",
  "production/src/app/api/products/[slug]/route.ts",
  "production/src/app/api/cart/route.ts",
  "production/src/app/api/checkout/route.ts",
  "production/src/app/api/auth/register/route.ts",
  "production/src/app/api/auth/login/route.ts",
  "production/src/app/api/orders/route.ts",
  "production/src/app/api/orders/[id]/route.ts",
];
for (const file of runtimeConsumers) {
  edit(file, (source) => exact(source, 'from "@/lib/server/runtime"', 'from "@/lib/server/runtime-selected"', `${file} runtime import`));
}

edit("production/src/lib/server/persistent-store.ts", (source) => {
  source = `import { createHash } from "node:crypto";\n${source}`;
  source = exact(source,
`  async issue(user: PublicUser): Promise<AuthSession> {
    // Transitional only. Replace with Better Auth database sessions before production.
    const token = \`${"${crypto.randomUUID()}${crypto.randomUUID()}"}\`.replaceAll("-", "");
    const session = { token, user, expiresAt: new Date(Date.now() + 7 * 86_400_000) };
    this.sessions.set(token, session);
    return session;
  }
  resolveSession(token: string): AuthSession | null {
    const session = this.sessions.get(token);
    if (!session || session.expiresAt <= new Date()) { this.sessions.delete(token); return null; }
    return session;
  }`,
`  async issue(user: PublicUser): Promise<AuthSession> {
    const token = \`${"${crypto.randomUUID()}${crypto.randomUUID()}"}\`.replaceAll("-", "");
    const expiresAt = new Date(Date.now() + 7 * 86_400_000);
    await this.db.$executeRawUnsafe(
      "INSERT INTO auth_tokens(user_id,type,token_hash,expires_at) VALUES ($1::uuid,'REFRESH_TOKEN',$2,$3)",
      user.id, hashToken(token), expiresAt,
    );
    return { token, user, expiresAt };
  }
  async resolveSession(token: string): Promise<AuthSession | null> {
    const rows = await this.db.$queryRawUnsafe<Array<{ id: string; email: string; full_name: string; status: User["status"]; expires_at: Date }>>(
      `SELECT u.id,u.email,u.full_name,u.status,t.expires_at
         FROM auth_tokens t JOIN users u ON u.id=t.user_id
        WHERE t.token_hash=$1 AND t.type='REFRESH_TOKEN' AND t.consumed_at IS NULL
          AND t.expires_at > NOW() AND u.deleted_at IS NULL`,
      hashToken(token),
    );
    const row = rows[0];
    if (!row) return null;
    return { token, user: { id: row.id, email: row.email, fullName: row.full_name, status: row.status }, expiresAt: row.expires_at };
  }`, "persistent database session");
  source = exact(source,
    'await tx.$executeRawUnsafe("INSERT INTO coupon_redemptions(coupon_id,order_id,user_id,discount_amount) VALUES ($1::uuid,$2::uuid,$3::uuid,$4)", candidate.id, rows[0].id, owner.userId ?? null, candidate.discountTotal);',
    'await tx.$executeRawUnsafe("INSERT INTO coupon_redemptions(coupon_id,order_id,user_id) VALUES ($1::uuid,$2::uuid,$3::uuid)", rows[0].id, candidate.id, owner.userId ?? null);',
    "coupon redemption columns",
  );
  return `${source.trimEnd()}\nconst hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");\n`;
});

edit("production/src/lib/server/http.ts", (source) => {
  source = exact(source, "export function ownerFrom(request: NextRequest): string {", "export async function ownerFrom(request: NextRequest): Promise<string> {", "async owner resolver");
  return exact(source, "const session = runtime.store.resolveSession(authorization.slice(7));", "const session = await runtime.store.resolveSession(authorization.slice(7));", "await session lookup");
});

edit("production/src/lib/server/admin.ts", (source) => exact(source, "const session = runtime.store.resolveSession(authorization.slice(7));", "const session = await runtime.store.resolveSession(authorization.slice(7));", "await admin session"));

for (const file of ["production/src/app/api/cart/route.ts", "production/src/app/api/checkout/route.ts", "production/src/app/api/orders/route.ts"]) {
  edit(file, (source) => source.replaceAll("ownerFrom(request)", "await ownerFrom(request)"));
}
edit("production/src/app/api/orders/[id]/route.ts", (source) => {
  source = exact(source, "const order = await runtime.store.findById((await context.params).id);", "const order = await runtime.store.findById((await context.params).id);\n    const ownerKey = await ownerFrom(request);", "order owner resolution");
  return exact(source, "order.ownerKey !== ownerFrom(request)", "order.ownerKey !== ownerKey", "order ownership check");
});

edit("database/schema.sql", (source) => {
  source = exact(source,
    "    provider_refund_id VARCHAR(150),\n    status payment_status NOT NULL DEFAULT 'PENDING',",
    "    provider_refund_id VARCHAR(150),\n    idempotency_key VARCHAR(100),\n    status payment_status NOT NULL DEFAULT 'PENDING',",
    "refund idempotency column",
  );
  source = exact(source,
    "CREATE TABLE shipments (",
    "CREATE UNIQUE INDEX uq_refunds_idempotency_key ON refunds (idempotency_key) WHERE idempotency_key IS NOT NULL;\n\nCREATE TABLE shipments (",
    "refund idempotency index",
  );
  const settings = `CREATE TABLE store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB NOT NULL DEFAULT '{}'::JSONB,
    description VARCHAR(255),
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_store_settings_public ON store_settings (key) WHERE is_public = TRUE;

`;
  source = exact(source, "CREATE TABLE audit_logs (", `${settings}CREATE TABLE audit_logs (`, "store settings table");
  return exact(source,
    "CREATE TRIGGER trg_content_updated_at BEFORE UPDATE ON content_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();",
    "CREATE TRIGGER trg_content_updated_at BEFORE UPDATE ON content_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();\nCREATE TRIGGER trg_store_settings_updated_at BEFORE UPDATE ON store_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();",
    "store settings trigger",
  );
});

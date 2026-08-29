import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const write = (file, value) => fs.writeFileSync(file, value, "utf8");
const replaceExact = (source, before, after, label) => {
  if (!source.includes(before)) throw new Error(`Missing ${label}`);
  return source.replace(before, after);
};
const edit = (file, transform) => write(file, transform(read(file)));

const runtimeRoutes = [
  "production/src/app/api/products/route.ts",
  "production/src/app/api/products/[slug]/route.ts",
  "production/src/app/api/cart/route.ts",
  "production/src/app/api/checkout/route.ts",
  "production/src/app/api/auth/register/route.ts",
  "production/src/app/api/auth/login/route.ts",
  "production/src/app/api/orders/route.ts",
  "production/src/app/api/orders/[id]/route.ts",
];
for (const file of runtimeRoutes) {
  edit(file, (source) => source.replaceAll('from "@/lib/server/runtime"', 'from "@/lib/server/runtime-selected"'));
}

edit("production/src/lib/server/http.ts", (source) => {
  source = source.replace('from "./runtime"', 'from "./runtime-selected"');
  source = replaceExact(source, "export function ownerFrom(request: NextRequest): string {", "export async function ownerFrom(request: NextRequest): Promise<string> {", "async owner resolver");
  return replaceExact(source, "const session = runtime.store.resolveSession(authorization.slice(7));", "const session = await runtime.store.resolveSession(authorization.slice(7));", "await session lookup");
});

edit("production/src/lib/server/persistent-store.ts", (source) => {
  source = 'import { createHash } from "node:crypto";\n' + source;
  const oldSession = [
    "  async issue(user: PublicUser): Promise<AuthSession> {",
    "    // Transitional only. Replace with Better Auth database sessions before production.",
    "    const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll(\"-\", \"\");",
    "    const session = { token, user, expiresAt: new Date(Date.now() + 7 * 86_400_000) };",
    "    this.sessions.set(token, session);",
    "    return session;",
    "  }",
    "  resolveSession(token: string): AuthSession | null {",
    "    const session = this.sessions.get(token);",
    "    if (!session || session.expiresAt <= new Date()) { this.sessions.delete(token); return null; }",
    "    return session;",
    "  }",
  ].join("\n");
  const newSession = [
    "  async issue(user: PublicUser): Promise<AuthSession> {",
    "    const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll(\"-\", \"\");",
    "    const expiresAt = new Date(Date.now() + 7 * 86_400_000);",
    "    await this.db.$executeRawUnsafe(",
    "      `INSERT INTO auth_tokens(user_id,type,token_hash,expires_at) VALUES ($1::uuid,'REFRESH_TOKEN',$2,$3)`,",
    "      user.id, hashToken(token), expiresAt,",
    "    );",
    "    return { token, user, expiresAt };",
    "  }",
    "  async resolveSession(token: string): Promise<AuthSession | null> {",
    "    const rows = await this.db.$queryRawUnsafe<Array<{ id: string; email: string; full_name: string; status: User['status']; expires_at: Date }>>(",
    "      `SELECT u.id, u.email, u.full_name, u.status, t.expires_at",
    "         FROM auth_tokens t JOIN users u ON u.id = t.user_id",
    "        WHERE t.token_hash = $1 AND t.type = 'REFRESH_TOKEN' AND t.consumed_at IS NULL",
    "          AND t.expires_at > NOW() AND u.deleted_at IS NULL LIMIT 1`,",
    "      hashToken(token),",
    "    );",
    "    const row = rows[0];",
    "    return row ? { token, user: { id: row.id, email: row.email, fullName: row.full_name, status: row.status }, expiresAt: row.expires_at } : null;",
    "  }",
  ].join("\n");
  source = replaceExact(source, oldSession, newSession, "persistent database session block");
  source = source.replace("  private readonly sessions = new Map<string, AuthSession>();\n", "");
  source = replaceExact(
    source,
    'await tx.$executeRawUnsafe("INSERT INTO coupon_redemptions(coupon_id,order_id,user_id,discount_amount) VALUES ($1::uuid,$2::uuid,$3::uuid,$4)", rows[0].id, candidate.id, owner.userId ?? null, candidate.discountTotal);',
    'await tx.$executeRawUnsafe("INSERT INTO coupon_redemptions(coupon_id,order_id,user_id) VALUES ($1::uuid,$2::uuid,$3::uuid)", rows[0].id, candidate.id, owner.userId ?? null);',
    "coupon redemption insert",
  );
  return source + '\nconst hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");\n';
});

edit("production/src/lib/server/admin.ts", (source) => replaceExact(source, "const session = runtime.store.resolveSession(authorization.slice(7));", "const session = await runtime.store.resolveSession(authorization.slice(7));", "admin session await"));

for (const file of [
  "production/src/app/api/cart/route.ts",
  "production/src/app/api/checkout/route.ts",
  "production/src/app/api/orders/route.ts",
]) edit(file, (source) => source.replaceAll("ownerFrom(request)", "await ownerFrom(request)"));

edit("production/src/app/api/orders/[id]/route.ts", (source) => {
  source = replaceExact(source, "const order = await runtime.store.findById((await context.params).id);", "const order = await runtime.store.findById((await context.params).id);\n    const ownerKey = await ownerFrom(request);", "order owner resolution");
  return replaceExact(source, "order.ownerKey !== ownerFrom(request)", "order.ownerKey !== ownerKey", "order ownership check");
});

edit("production/src/components/admin/dashboard.tsx", (source) => replaceExact(source, "key={height + index}", 'key={`${height}-${index}`}', "dashboard chart key"));
edit("production/src/app/layout.tsx", (source) => replaceExact(source, '<html lang="vi">', '<html lang="vi" data-scroll-behavior="smooth">', "scroll behavior marker"));

console.log("Persistence activation and QA fixes applied.");

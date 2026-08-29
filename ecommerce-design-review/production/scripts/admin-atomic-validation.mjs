import { readFileSync, writeFileSync } from "node:fs";

function replace(path, before, after) {
  const source = readFileSync(path, "utf8");
  if (!source.includes(before)) throw new Error(`Expected source not found: ${path}`);
  writeFileSync(path, source.replace(before, after), "utf8");
}

replace("src/lib/server/admin-atomic.ts", `audit: AuditEntry }`, `audit?: AuditEntry }`);
replace("src/lib/server/admin-atomic.ts", `await insertAudit(tx, actor, request, mutation.audit);`, `if (mutation.audit) await insertAudit(tx, actor, request, mutation.audit);`);

const refundPath = "src/app/api/admin/refunds/route.ts";
let refund = readFileSync(refundPath, "utf8");
refund = refund.replace(`import { adminRoute, pageParams } from "@/lib/server/admin";`, `import { adminRoute, pageParams } from "@/lib/server/admin";\nimport { adminAtomicMutationRoute } from "@/lib/server/admin-atomic";`);
refund = refund.replace(`export const POST = (request: NextRequest) => adminRoute(request, "orders.write", async ({ db }) => {`, `export const POST = (request: NextRequest) => adminAtomicMutationRoute(request, "orders.write", async ({ tx }) => {`);
refund = refund.replace(`  const result = await db.$transaction(async (tx) => {`, ``);
refund = refund.replace(`  }, { isolationLevel: "Serializable" });\n  return { data: result, status: result.replayed ? 200 : 201, audit: result.replayed ? undefined : { action: "REFUND_REQUESTED", entityType: "REFUND", entityId: String(result.refund.id), after: result.refund } };`, `  return { data: result, status: result.replayed ? 200 : 201, audit: result.replayed ? undefined : { action: "REFUND_REQUESTED", entityType: "REFUND", entityId: String(result.refund.id), after: result.refund } };`);
writeFileSync(refundPath, refund, "utf8");

const orderPath = "src/app/api/admin/orders/route.ts";
let orders = readFileSync(orderPath, "utf8");
orders = orders.replace(`import { adminRoute, pageParams } from "@/lib/server/admin";`, `import { adminRoute, pageParams } from "@/lib/server/admin";\nimport { AppError } from "@/modules/shared";`);
orders = orders.replace(`  const status = request.nextUrl.searchParams.get("status") as any;\n  const where = status ? { status } : {};`, `  const status = request.nextUrl.searchParams.get("status");\n  const allowed = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPING", "DELIVERED", "CANCELLED", "RETURN_REQUESTED", "RETURNED"] as const;\n  if (status && !allowed.includes(status as typeof allowed[number])) throw new AppError("VALIDATION_ERROR", "Trạng thái đơn hàng không hợp lệ", 400);\n  const where = status ? { status: status as typeof allowed[number] } : {};`);
writeFileSync(orderPath, orders, "utf8");

const auditPath = "src/app/api/admin/audit/route.ts";
let audit = readFileSync(auditPath, "utf8");
audit = audit.replace(`import { adminRoute, pageParams } from "@/lib/server/admin";`, `import { adminRoute, pageParams } from "@/lib/server/admin";\nimport { AppError } from "@/modules/shared";`);
audit = audit.replace(`  const actorId = request.nextUrl.searchParams.get("actorId");`, `  const actorId = request.nextUrl.searchParams.get("actorId");\n  if (actorId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(actorId)) throw new AppError("VALIDATION_ERROR", "actorId không phải UUID hợp lệ", 400);`);
writeFileSync(auditPath, audit, "utf8");

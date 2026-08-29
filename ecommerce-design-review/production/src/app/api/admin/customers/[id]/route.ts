import { NextRequest } from "next/server";
import { adminRoute } from "@/lib/server/admin";
import { AppError, object, stringField } from "@/modules/shared";
import { uuidParam } from "@/lib/server/account";

type Context = { params: Promise<{ id: string }> };

export const GET = (request: NextRequest, context: Context) => adminRoute(request, "customers.read", async ({ db }) => {
  const id = uuidParam((await context.params).id);
  const users = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT u.id,u.email,u.phone,u.full_name,u.avatar_url,u.status,
    u.email_verified_at,u.last_login_at,u.created_at,u.updated_at,
    COALESCE((SELECT SUM(grand_total) FROM orders WHERE user_id=u.id AND status='DELIVERED'),0)::text AS lifetime_spend
    FROM users u WHERE u.id=$1::uuid AND u.deleted_at IS NULL`, id);
  if (!users[0]) throw new AppError("NOT_FOUND", "Không tìm thấy khách hàng", 404);
  const [addresses, orders] = await Promise.all([
    db.$queryRawUnsafe<Array<Record<string, unknown>>>("SELECT * FROM addresses WHERE user_id=$1::uuid ORDER BY is_default DESC,created_at DESC", id),
    db.$queryRawUnsafe<Array<Record<string, unknown>>>("SELECT id,code,status,payment_status,grand_total::text,placed_at FROM orders WHERE user_id=$1::uuid ORDER BY placed_at DESC LIMIT 50", id),
  ]);
  return { data: { ...users[0], addresses, orders } };
});

export const PATCH = (request: NextRequest, context: Context) => adminRoute(request, "customers.write", async ({ db }) => {
  const id = uuidParam((await context.params).id);
  const body = object(await request.json());
  const status = stringField(body, "status", { max: 30 })!;
  if (!["ACTIVE", "BLOCKED"].includes(status)) throw new AppError("VALIDATION_ERROR", "Chỉ hỗ trợ khóa hoặc mở khóa tài khoản", 400);
  const before = await db.user.findUnique({ where: { id } });
  if (!before) throw new AppError("NOT_FOUND", "Không tìm thấy khách hàng", 404);
  const elevated = await db.$queryRawUnsafe<Array<{ exists: boolean }>>("SELECT EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=$1::uuid AND r.code IN ('ADMIN','STAFF')) AS exists", id);
  if (elevated[0]?.exists) throw new AppError("FORBIDDEN", "Không thể thay đổi tài khoản quản trị từ module khách hàng", 403);
  const after = await db.user.update({ where: { id }, data: { status: status as "ACTIVE" | "BLOCKED" } });
  return { data: after, audit: { action: status === "BLOCKED" ? "CUSTOMER_BLOCKED" : "CUSTOMER_UNBLOCKED", entityType: "USER", entityId: id, before: { status: before.status }, after: { status } } };
});

import { NextRequest } from "next/server";
import { adminAtomicMutationRoute } from "@/lib/server/admin-atomic";
import { uuidParam } from "@/lib/server/account";
import { AppError, object, stringField } from "@/modules/shared";

export const PATCH = (request: NextRequest, context: { params: Promise<{ id: string }> }) =>
  adminAtomicMutationRoute(request, "staff.write", async ({ tx, actor }) => {
    const id = uuidParam((await context.params).id, "staffId");
    const status = stringField(object(await request.json()), "status", { max: 30 })!;
    if (!["ACTIVE", "BLOCKED"].includes(status)) throw new AppError("VALIDATION_ERROR", "Trạng thái nhân viên không hợp lệ", 400);
    if (id === actor.userId && status === "BLOCKED") throw new AppError("CONFLICT", "Không thể tự khóa tài khoản đang thao tác", 409);
    const users = await tx.$queryRawUnsafe<Array<{ id: string; status: string; is_admin: boolean }>>(`SELECT u.id,u.status::text,
      EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.code='ADMIN') AS is_admin
      FROM users u WHERE u.id=$1::uuid AND u.deleted_at IS NULL FOR UPDATE`, id);
    const staff = users[0];
    if (!staff) throw new AppError("NOT_FOUND", "Không tìm thấy nhân viên", 404);
    if (staff.is_admin && status === "BLOCKED") {
      const [{ count }] = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT COUNT(DISTINCT u.id)::bigint AS count FROM users u
        JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE r.code='ADMIN' AND u.status='ACTIVE' AND u.deleted_at IS NULL`);
      if (Number(count) <= 1) throw new AppError("CONFLICT", "Hệ thống phải còn ít nhất một ADMIN hoạt động", 409);
    }
    await tx.$executeRawUnsafe("UPDATE users SET status=$2::user_status,updated_at=NOW() WHERE id=$1::uuid", id, status);
    if (status === "BLOCKED") await tx.$executeRawUnsafe("UPDATE auth_tokens SET consumed_at=NOW() WHERE user_id=$1::uuid AND type='REFRESH_TOKEN' AND consumed_at IS NULL", id);
    return { data: { id, status, sessionsRevoked: status === "BLOCKED" }, audit: { action: status === "BLOCKED" ? "STAFF_BLOCKED" : "STAFF_UNBLOCKED", entityType: "USER", entityId: id, before: { status: staff.status }, after: { status } } };
  });
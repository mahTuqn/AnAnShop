import { NextRequest } from "next/server";
import { adminAtomicMutationRoute } from "@/lib/server/admin-atomic";
import { validateRoleAssignment } from "@/modules/admin/rbac";
import { AppError } from "@/modules/shared";

type Context = { params: Promise<{ id: string; roleCode: string }> };

export const POST = (request: NextRequest, context: Context) => mutateRole(request, context, "ASSIGN");
export const DELETE = (request: NextRequest, context: Context) => mutateRole(request, context, "REVOKE");

const mutateRole = (request: NextRequest, context: Context, action: "ASSIGN" | "REVOKE") => adminAtomicMutationRoute(request, "staff.write", async ({ tx, actor }) => {
  const { id: targetUserId, roleCode: rawRoleCode } = await context.params;
  const roleCode = rawRoleCode.toUpperCase();
  const users = await tx.$queryRawUnsafe<Array<{ id: string; status: string }>>("SELECT id,status::text FROM users WHERE id=$1::uuid AND deleted_at IS NULL FOR UPDATE", targetUserId);
  if (!users[0]) throw new AppError("NOT_FOUND", "Không tìm thấy nhân viên", 404);
  const roles = await tx.$queryRawUnsafe<Array<{ id: string; code: string }>>("SELECT id,code FROM roles WHERE code=$1", roleCode);
  const assigned = roles[0] ? await tx.$queryRawUnsafe<Array<{ exists: boolean }>>("SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id=$1::uuid AND role_id=$2::uuid) AS exists", targetUserId, roles[0].id) : [{ exists: false }];
  const [{ count }] = await tx.$queryRawUnsafe<Array<{ count: bigint }>>("SELECT COUNT(DISTINCT ur.user_id)::bigint AS count FROM user_roles ur JOIN roles r ON r.id=ur.role_id JOIN users u ON u.id=ur.user_id WHERE r.code='ADMIN' AND u.status='ACTIVE' AND u.deleted_at IS NULL");
  const policy = validateRoleAssignment({ actorId: actor.userId, targetUserId, roleCode, action, roleExists: Boolean(roles[0]), alreadyAssigned: assigned[0].exists, activeAdminCount: Number(count), targetIsActiveAdmin: roleCode === "ADMIN" && users[0].status === "ACTIVE" && assigned[0].exists });
  if (!policy.ok) throw policy.error;
  if (action === "ASSIGN") await tx.$executeRawUnsafe("INSERT INTO user_roles(user_id,role_id,assigned_at) VALUES($1::uuid,$2::uuid,NOW())", targetUserId, roles[0].id);
  else await tx.$executeRawUnsafe("DELETE FROM user_roles WHERE user_id=$1::uuid AND role_id=$2::uuid", targetUserId, roles[0].id);
  return { data: { userId: targetUserId, roleCode, assigned: action === "ASSIGN" }, audit: { action: `STAFF_ROLE_${action}ED`, entityType: "USER", entityId: targetUserId, before: { roleCode, assigned: action === "REVOKE" }, after: { roleCode, assigned: action === "ASSIGN" } } };
});


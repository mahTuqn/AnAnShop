import { NextRequest } from "next/server";
import { adminRoute, pageParams } from "@/lib/server/admin";
import { adminAtomicMutationRoute } from "@/lib/server/admin-atomic";
import { Pbkdf2PasswordHasher } from "@/lib/server/passwords";
import { AppError, email, object, stringField } from "@/modules/shared";

export const GET = (request: NextRequest) => adminRoute(request, "staff.read", async ({ db }) => {
  const { page, pageSize, skip } = pageParams(request);
  const q = request.nextUrl.searchParams.get("q")?.trim() || null;
  const items = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT u.id,u.email,u.phone,u.full_name,u.status,u.last_login_at,u.created_at,
    COALESCE(array_agg(DISTINCT r.code) FILTER (WHERE r.code IS NOT NULL),'{}') AS roles
    FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id
    WHERE u.deleted_at IS NULL AND EXISTS(SELECT 1 FROM user_roles ux JOIN roles rx ON rx.id=ux.role_id WHERE ux.user_id=u.id AND rx.code IN ('STAFF','ADMIN'))
      AND ($1::text IS NULL OR u.full_name ILIKE '%'||$1||'%' OR u.email ILIKE '%'||$1||'%')
    GROUP BY u.id ORDER BY u.created_at DESC OFFSET $2 LIMIT $3`, q, skip, pageSize);
  const [{ count }] = await db.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT COUNT(*)::bigint AS count FROM users u WHERE u.deleted_at IS NULL
    AND EXISTS(SELECT 1 FROM user_roles ux JOIN roles rx ON rx.id=ux.role_id WHERE ux.user_id=u.id AND rx.code IN ('STAFF','ADMIN'))
    AND ($1::text IS NULL OR u.full_name ILIKE '%'||$1||'%' OR u.email ILIKE '%'||$1||'%')`, q);
  return { data: { items, meta: { page, pageSize, total: Number(count) } } };
});

export const POST = (request: NextRequest) => adminAtomicMutationRoute(request, "staff.write", async ({ tx }) => {
  const body = object(await request.json());
  const normalizedEmail = email(stringField(body, "email", { max: 320 })!);
  const fullName = stringField(body, "fullName", { min: 2, max: 150 })!;
  const password = stringField(body, "temporaryPassword", { min: 8, max: 128 })!;
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) throw new AppError("VALIDATION_ERROR", "Mật khẩu tạm phải gồm chữ và số", 400);
  const duplicate = await tx.user.findFirst({ where: { email: { equals: normalizedEmail, mode: "insensitive" }, deletedAt: null }, select: { id: true } });
  if (duplicate) throw new AppError("CONFLICT", "Email đã được sử dụng", 409);
  const passwordHash = await new Pbkdf2PasswordHasher().hash(password);
  const staff = await tx.user.create({ data: { email: normalizedEmail, fullName, passwordHash, status: "ACTIVE", emailVerifiedAt: new Date() } });
  const inserted = await tx.$executeRawUnsafe("INSERT INTO user_roles(user_id,role_id,assigned_at) SELECT $1::uuid,id,NOW() FROM roles WHERE code='STAFF'", staff.id);
  if (inserted !== 1) throw new AppError("INTERNAL_ERROR", "Vai trò STAFF chưa được cấu hình", 500);
  return { data: { id: staff.id, email: staff.email, fullName: staff.fullName, status: staff.status, roles: ["STAFF"] }, status: 201,
    audit: { action: "STAFF_CREATED", entityType: "USER", entityId: staff.id, after: { email: staff.email, fullName: staff.fullName, roles: ["STAFF"] } } };
});
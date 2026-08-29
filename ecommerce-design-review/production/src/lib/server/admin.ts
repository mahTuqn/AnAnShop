import { NextRequest, NextResponse } from "next/server";
import type { PrismaClient } from "@/generated/prisma/client";
import { AppError } from "@/modules/shared";
import { getPrisma } from "./prisma";
import { getRuntime } from "./runtime-resolver";
import { safeRoute } from "./http";

export interface AdminActor { userId: string; roles: string[]; permissions: string[] }
export interface AuditEntry { action: string; entityType: string; entityId?: string; before?: unknown; after?: unknown }

export async function requireAdmin(request: NextRequest, permission: string): Promise<AdminActor> {
  const authorization = request.headers.get("authorization");
  if (authorization && !authorization.startsWith("Bearer ")) throw new AppError("UNAUTHORIZED", "Header xác thực không hợp lệ", 401);
  const token = authorization?.slice(7) || request.cookies.get("anan_session")?.value || request.cookies.get("anan_admin_session")?.value;
  if (!token) throw new AppError("UNAUTHORIZED", "Yêu cầu đăng nhập quản trị", 401);
  const runtime = await getRuntime();
  const session = await runtime.store.resolveSession(token);
  if (!session) throw new AppError("UNAUTHORIZED", "Phiên quản trị không hợp lệ", 401);
  const db = getPrisma();
  const rows = await db.$queryRawUnsafe<Array<{ role_code: string; permission_code: string | null }>>(
    `SELECT r.code AS role_code, p.code AS permission_code
       FROM user_roles ur JOIN roles r ON r.id = ur.role_id
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
       LEFT JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = $1::uuid`, session.user.id,
  );
  const roles = [...new Set(rows.map((row) => row.role_code))];
  const permissions = [...new Set(rows.flatMap((row) => row.permission_code ? [row.permission_code] : []))];
  if (!roles.includes("ADMIN") && !permissions.includes(permission)) throw new AppError("FORBIDDEN", "Bạn không có quyền thực hiện thao tác này", 403, { permission });
  return { userId: session.user.id, roles, permissions };
}

export function adminRoute(
  request: NextRequest,
  permission: string,
  operation: (context: { db: PrismaClient; actor: AdminActor }) => Promise<{ data: unknown; status?: number; audit?: AuditEntry }>,
): Promise<NextResponse> {
  return safeRoute(async () => {
    const actor = await requireAdmin(request, permission);
    const db = getPrisma();
    const result = await operation({ db, actor });
    if (result.audit) await writeAudit(db, actor, request, result.audit);
    return NextResponse.json({ data: result.data }, { status: result.status ?? 200 });
  });
}

async function writeAudit(db: PrismaClient, actor: AdminActor, request: NextRequest, entry: AuditEntry): Promise<void> {
  await db.$executeRawUnsafe(
    `INSERT INTO audit_logs(actor_user_id, action, entity_type, entity_id, before_data, after_data, ip_address, user_agent)
     VALUES ($1::uuid,$2,$3,$4::uuid,$5::jsonb,$6::jsonb,$7::inet,$8)`,
    actor.userId, entry.action, entry.entityType, entry.entityId ?? null,
    JSON.stringify(entry.before ?? null), JSON.stringify(entry.after ?? null),
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    request.headers.get("user-agent"),
  );
}

export const pageParams = (request: NextRequest): { page: number; pageSize: number; skip: number } => {
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("pageSize") ?? 20) || 20));
  return { page, pageSize, skip: (page - 1) * pageSize };
};


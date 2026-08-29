import { NextRequest } from "next/server";
import { adminRoute, pageParams } from "@/lib/server/admin";
import { AppError } from "@/modules/shared";

export const GET = (request: NextRequest) => adminRoute(request, "audit.read", async ({ db }) => {
  const { page, pageSize, skip } = pageParams(request);
  const entityType = request.nextUrl.searchParams.get("entityType");
  const actorId = request.nextUrl.searchParams.get("actorId");
  if (actorId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actorId)) throw new AppError("VALIDATION_ERROR", "actorId không phải UUID hợp lệ", 400);
  const items = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT a.*,u.full_name AS actor_name,u.email AS actor_email
    FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_user_id
    WHERE ($1::text IS NULL OR a.entity_type=$1) AND ($2::uuid IS NULL OR a.actor_user_id=$2::uuid)
    ORDER BY a.created_at DESC OFFSET $3 LIMIT $4`, entityType, actorId, skip, pageSize);
  const [{ count }] = await db.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT COUNT(*)::bigint AS count FROM audit_logs
    WHERE ($1::text IS NULL OR entity_type=$1) AND ($2::uuid IS NULL OR actor_user_id=$2::uuid)`, entityType, actorId);
  return { data: { items, meta: { page, pageSize, total: Number(count) } } };
});


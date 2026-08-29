import { NextRequest } from "next/server";
import { adminRoute, pageParams } from "@/lib/server/admin";
import { AppError } from "@/modules/shared";

const statuses = ["PENDING_VERIFICATION", "ACTIVE", "BLOCKED"] as const;

export const GET = (request: NextRequest) => adminRoute(request, "customers.read", async ({ db }) => {
  const { page, pageSize, skip } = pageParams(request);
  const q = request.nextUrl.searchParams.get("q")?.trim() || null;
  const status = request.nextUrl.searchParams.get("status");
  if (status && !statuses.includes(status as (typeof statuses)[number])) {
    throw new AppError("VALIDATION_ERROR", "Trạng thái khách hàng không hợp lệ", 400);
  }
  const items = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT
    u.id,u.email,u.phone,u.full_name,u.avatar_url,u.status,u.email_verified_at,u.last_login_at,u.created_at,
    COALESCE(oa.order_count,0)::int AS order_count,
    COALESCE(oa.lifetime_spend,0)::text AS lifetime_spend,
    oa.last_order_at,
    COALESCE(aa.address_count,0)::int AS address_count,
    CASE
      WHEN COALESCE(oa.lifetime_spend,0) >= 20000000 THEN 'DIAMOND'
      WHEN COALESCE(oa.lifetime_spend,0) >= 10000000 THEN 'GOLD'
      WHEN COALESCE(oa.lifetime_spend,0) >= 3000000 THEN 'SILVER'
      ELSE 'NORMAL'
    END AS tier
  FROM users u
  LEFT JOIN LATERAL (SELECT COUNT(*) AS order_count,COALESCE(SUM(grand_total) FILTER (WHERE status='DELIVERED'),0) AS lifetime_spend,MAX(placed_at) AS last_order_at FROM orders WHERE user_id=u.id) oa ON TRUE
  LEFT JOIN LATERAL (SELECT COUNT(*) AS address_count FROM addresses WHERE user_id=u.id) aa ON TRUE
  WHERE u.deleted_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM user_roles ur2 JOIN roles r2 ON r2.id=ur2.role_id WHERE ur2.user_id=u.id AND r2.code IN ('ADMIN','STAFF'))
    AND ($1::text IS NULL OR u.full_name ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%' OR u.phone ILIKE '%' || $1 || '%')
    AND ($2::text IS NULL OR u.status::text=$2)
  ORDER BY u.created_at DESC OFFSET $3 LIMIT $4`, q, status, skip, pageSize);
  const [{ count }] = await db.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT COUNT(*)::bigint AS count FROM users u
    WHERE u.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.code IN ('ADMIN','STAFF'))
      AND ($1::text IS NULL OR u.full_name ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%' OR u.phone ILIKE '%' || $1 || '%')
      AND ($2::text IS NULL OR u.status::text=$2)`, q, status);
  return { data: { items, meta: { page, pageSize, total: Number(count) } } };
});

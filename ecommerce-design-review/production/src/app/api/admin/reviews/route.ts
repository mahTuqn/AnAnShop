import { NextRequest } from "next/server";
import { adminRoute, pageParams } from "@/lib/server/admin";
import { AppError } from "@/modules/shared";

export const GET = (request: NextRequest) => adminRoute(request, "reviews.read", async ({ db }) => {
  const { page, pageSize, skip } = pageParams(request);
  const status = request.nextUrl.searchParams.get("status");
  if (status && !["PENDING", "APPROVED", "REJECTED"].includes(status)) throw new AppError("VALIDATION_ERROR", "Trạng thái đánh giá không hợp lệ", 400);
  const q = request.nextUrl.searchParams.get("q")?.trim() || null;
  const items = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT r.id,r.rating,r.title,r.content,r.status,r.verified_purchase,r.created_at,r.moderated_at,
    u.full_name AS customer_name,u.email AS customer_email,p.name AS product_name,o.code AS order_code,
    COALESCE(jsonb_agg(jsonb_build_object('id',ri.id,'url',ri.url,'position',ri.position)) FILTER (WHERE ri.id IS NOT NULL),'[]') AS images
    FROM reviews r JOIN users u ON u.id=r.user_id JOIN products p ON p.id=r.product_id
    LEFT JOIN order_items oi ON oi.id=r.order_item_id LEFT JOIN orders o ON o.id=oi.order_id LEFT JOIN review_images ri ON ri.review_id=r.id
    WHERE ($1::text IS NULL OR r.status::text=$1)
      AND ($2::text IS NULL OR u.full_name ILIKE '%'||$2||'%' OR p.name ILIKE '%'||$2||'%' OR r.content ILIKE '%'||$2||'%')
    GROUP BY r.id,u.full_name,u.email,p.name,o.code ORDER BY r.created_at DESC OFFSET $3 LIMIT $4`, status, q, skip, pageSize);
  const [{ count }] = await db.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT COUNT(*)::bigint AS count FROM reviews r JOIN users u ON u.id=r.user_id JOIN products p ON p.id=r.product_id
    WHERE ($1::text IS NULL OR r.status::text=$1) AND ($2::text IS NULL OR u.full_name ILIKE '%'||$2||'%' OR p.name ILIKE '%'||$2||'%' OR r.content ILIKE '%'||$2||'%')`, status, q);
  return { data: { items, meta: { page, pageSize, total: Number(count) } } };
});

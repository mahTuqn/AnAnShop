import { NextRequest } from "next/server";
import { adminRoute, pageParams } from "@/lib/server/admin";

export const GET = (request: NextRequest) => adminRoute(request, "orders.read", async ({ db }) => {
  const { page, pageSize, skip } = pageParams(request);
  const items = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT rr.*,o.code AS order_code,u.full_name AS customer_name
    FROM return_requests rr JOIN orders o ON o.id=rr.order_id LEFT JOIN users u ON u.id=rr.user_id
    ORDER BY rr.requested_at DESC OFFSET $1 LIMIT $2`, skip, pageSize);
  const [{ count }] = await db.$queryRawUnsafe<Array<{ count: bigint }>>("SELECT COUNT(*)::bigint AS count FROM return_requests");
  return { data: { items, meta: { page, pageSize, total: Number(count) } } };
});


import { NextRequest, NextResponse } from "next/server";
import { adminRoute, requireAdmin } from "@/lib/server/admin";
import { uuidParam } from "@/lib/server/account";
import { safeRoute } from "@/lib/server/http";
import { AppError } from "@/modules/shared";

export const GET = (request: NextRequest, context: { params: Promise<{ id: string }> }) => adminRoute(request, "orders.read", async ({ db }) => {
  const id = uuidParam((await context.params).id, "returnRequestId");
  const rows = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT rr.*,o.code AS order_code,o.payment_status,o.grand_total::text,u.full_name AS customer_name,
    (SELECT id FROM payments WHERE order_id=o.id ORDER BY created_at DESC LIMIT 1) AS payment_id,
    COALESCE((SELECT SUM(refund_amount) FROM return_items WHERE return_request_id=rr.id),0)::text AS expected_refund
    FROM return_requests rr JOIN orders o ON o.id=rr.order_id LEFT JOIN users u ON u.id=rr.user_id WHERE rr.id=$1::uuid`, id);
  if (!rows[0]) throw new AppError("NOT_FOUND", "Không tìm thấy yêu cầu đổi trả", 404);
  const [items] = await Promise.all([
    db.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT ri.*,oi.product_name,oi.variant_name,oi.sku,oi.image_url
      FROM return_items ri JOIN order_items oi ON oi.id=ri.order_item_id WHERE ri.return_request_id=$1::uuid ORDER BY ri.id`, id)
  ]);
  const refunds: any[] = [];
  return { data: { ...rows[0], items, refunds } };
});

export const PATCH = (request: NextRequest) => safeRoute(async () => {
  await requireAdmin(request, "orders.write");
  return NextResponse.json({ error: { code: "GONE", message: "Dùng endpoint /transition để đổi trạng thái đổi trả" } }, { status: 410 });
});
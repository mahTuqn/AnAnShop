import { NextRequest, NextResponse } from "next/server";
import { adminRoute, requireAdmin } from "@/lib/server/admin";
import { orderLookupWhere } from "@/lib/server/order-lookup";
import { safeRoute } from "@/lib/server/http";
import { AppError } from "@/modules/shared";

export const GET = (request: NextRequest, context: { params: Promise<{ id: string }> }) => adminRoute(request, "orders.read", async ({ db }) => {
  const reference = (await context.params).id;
  const order = await db.order.findUnique({ where: orderLookupWhere(reference), include: { addresses: true, items: true, payments: { orderBy: { createdAt: "desc" } } } });
  if (!order) throw new AppError("NOT_FOUND", "Không tìm thấy đơn hàng", 404);
  const [shipments, timeline, returns, refunds] = await Promise.all([
    db.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT s.*,COALESCE(jsonb_agg(jsonb_build_object('status',se.status,'location',se.location,'description',se.description,'occurredAt',se.occurred_at)
      ORDER BY se.occurred_at) FILTER(WHERE se.id IS NOT NULL),'[]') AS events FROM shipments s LEFT JOIN shipment_events se ON se.shipment_id=s.id
      WHERE s.order_id=$1::uuid GROUP BY s.id ORDER BY s.created_at`, order.id),
    db.$queryRawUnsafe<Array<Record<string, unknown>>>("SELECT from_status,to_status,reason,metadata,occurred_at FROM order_status_events WHERE order_id=$1::uuid ORDER BY occurred_at", order.id),
    db.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT rr.*,COALESCE(jsonb_agg(jsonb_build_object('id',ri.id,'orderItemId',ri.order_item_id,'quantity',ri.quantity,'condition',ri.condition,'resolution',ri.resolution,'refundAmount',ri.refund_amount)) FILTER(WHERE ri.id IS NOT NULL),'[]') AS items
      FROM return_requests rr LEFT JOIN return_items ri ON ri.return_request_id=rr.id WHERE rr.order_id=$1::uuid GROUP BY rr.id ORDER BY rr.requested_at`, order.id),
    db.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT r.* FROM refunds r JOIN payments p ON p.id=r.payment_id WHERE p.order_id=$1::uuid ORDER BY r.created_at`, order.id),
  ]);
  return { data: { ...order, shipments, timeline, returns, refunds } };
});

export const PATCH = (request: NextRequest) => safeRoute(async () => {
  await requireAdmin(request, "orders.write");
  return NextResponse.json({ error: { code: "GONE", message: "Dùng endpoint /transition để đổi trạng thái đơn hàng" } }, { status: 410 });
});
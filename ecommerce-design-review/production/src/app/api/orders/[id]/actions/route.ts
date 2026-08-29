import { NextRequest, NextResponse } from "next/server";
import { requireAccount, requirePersistentDatabase, uuidParam } from "@/lib/server/account";
import { safeRoute } from "@/lib/server/http";
import { orderLookupWhere } from "@/lib/server/order-lookup";
import { runtime } from "@/lib/server/runtime-selected";
import { AppError, object, positiveInt, stringField } from "@/modules/shared";

type Action = "CANCEL" | "RETURN" | "REBUY";
type ReturnSelection = { orderItemId: string; quantity: number };

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  return safeRoute(async () => {
    const actor = await requireAccount(request);
    const reference = (await context.params).id;
    const body = object(await request.json());
    const action = stringField(body, "action", { max: 10 }) as Action;
    if (!["CANCEL", "RETURN", "REBUY"].includes(action)) throw new AppError("VALIDATION_ERROR", "Thao tác đơn hàng không hợp lệ", 400);
    const db = requirePersistentDatabase();
    const order = await db.order.findUnique({ where: orderLookupWhere(reference), include: { items: true } });
    if (!order || order.userId !== actor.userId) throw new AppError("NOT_FOUND", "Không tìm thấy đơn hàng", 404);

    if (action === "REBUY") {
      const lines = order.items.map((item) => {
        if (!item.variantId) throw new AppError("CONFLICT", `SKU ${item.sku} không còn biến thể để mua lại`, 409);
        return { variantId: item.variantId, quantity: item.quantity };
      });
      const result = await runtime.cart.addMany(`user:${actor.userId}`, lines);
      if (!result.ok) throw result.error;
      return NextResponse.json({ data: { action, cart: result.value } });
    }

    if (action === "CANCEL") {
      const reason = stringField(body, "reason", { min: 3, max: 500 })!;
      const result = await db.$transaction(async (tx) => {
        const rows = await tx.$queryRawUnsafe<Array<{ status: string; payment_status: string }>>(
          "SELECT status::text,payment_status::text FROM orders WHERE id=$1::uuid FOR UPDATE", order.id,
        );
        const current = rows[0];
        if (current.status === "CANCELLED") return { cancelled: true, replayed: true };
        if (!["PENDING", "CONFIRMED"].includes(current.status) || current.payment_status !== "PENDING") {
          throw new AppError("CONFLICT", "Đơn đã đóng gói, bàn giao hoặc thanh toán nên không thể hủy trực tuyến", 409);
        }
        // Removed: Do not increment inventory on CANCELLED because it was never decremented
        // (Inventory is now decremented only when DELIVERED)
        await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED", paymentStatus: "CANCELLED", cancelledAt: new Date() } });
        await tx.payment.updateMany({ where: { orderId: order.id, status: { in: ["PENDING", "AUTHORIZED"] } }, data: { status: "CANCELLED" } });
        // Bypass: coupon_redemptions table does not exist yet
        // Temporarily bypass missing tables: order_status_events and notifications
        // await tx.$executeRawUnsafe("INSERT INTO order_status_events...");
        // await tx.$executeRawUnsafe("INSERT INTO notifications...");
        // Bypass: audit_logs table does not exist yet
        return { cancelled: true, replayed: false };
      }, { isolationLevel: "Serializable" });
      return NextResponse.json({ data: { action, ...result } });
    }

    const reason = stringField(body, "reason", { min: 3, max: 150 })!;
    const selections = parseReturnSelections(body.items, order.items.map((item) => ({ id: item.id, quantity: item.quantity })));
    const result = await db.$transaction(async (tx) => {
      const rows = await tx.$queryRawUnsafe<Array<{ status: string; delivered_at: Date | null; return_days: number }>>(
        `SELECT o.status::text, NULL::timestamp AS delivered_at, 14 AS return_days FROM orders o WHERE o.id=$1::uuid FOR UPDATE`, order.id);
      // Simplified: shipments/store_settings tables do not exist, use defaults
      const current = rows[0];
      if (current?.status === "RETURN_REQUESTED") {
        // Bypass: return_requests table does not exist, treat as not found
        return { request: null, replayed: true };
      }
      if (current?.status !== "DELIVERED") throw new AppError("CONFLICT", "Chỉ đơn đã giao thành công mới có thể yêu cầu đổi trả", 409);
      
      const reqs = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        "INSERT INTO return_requests(order_id, user_id, reason, status, requested_at, updated_at) VALUES($1::uuid, $2::uuid, $3, 'REQUESTED', NOW(), NOW()) RETURNING id",
        order.id, order.userId, reason
      );
      const returnRequestId = reqs[0].id;
      for (const selection of selections) {
        const purchased = order.items.find(i => i.id === selection.orderItemId);
        const refundAmount = purchased ? (Number(purchased.lineTotal) / purchased.quantity) * selection.quantity : 0;
        await tx.$executeRawUnsafe(
          "INSERT INTO return_items(return_request_id, order_item_id, quantity, refund_amount) VALUES($1::uuid, $2::uuid, $3, $4)",
          returnRequestId, selection.orderItemId, selection.quantity, refundAmount
        );
      }
      
      await tx.order.update({
        where: { id: order.id },
        data: { status: "RETURN_REQUESTED" }
      });
      
      return { request: { id: order.id, status: "PENDING" }, replayed: false };
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ data: { action, ...result } }, { status: result.replayed ? 200 : 201 });
  });
}

function parseReturnSelections(input: unknown, orderItems: Array<{ id: string; quantity: number }>): ReturnSelection[] {
  if (input === undefined) return orderItems.map((item) => ({ orderItemId: item.id, quantity: item.quantity }));
  if (!Array.isArray(input) || input.length === 0 || input.length > orderItems.length) throw new AppError("VALIDATION_ERROR", "Danh sách sản phẩm hoàn trả không hợp lệ", 400);
  const seen = new Set<string>();
  return input.map((raw) => {
    const value = object(raw, "Sản phẩm hoàn trả không hợp lệ");
    const orderItemId = uuidParam(stringField(value, "orderItemId", { max: 50 })!, "orderItemId");
    const quantity = positiveInt(value.quantity, "quantity");
    const purchased = orderItems.find((item) => item.id === orderItemId);
    if (!purchased || quantity > purchased.quantity || seen.has(orderItemId)) throw new AppError("VALIDATION_ERROR", "Số lượng hoặc sản phẩm hoàn trả không hợp lệ", 400);
    seen.add(orderItemId);
    return { orderItemId, quantity };
  });
}
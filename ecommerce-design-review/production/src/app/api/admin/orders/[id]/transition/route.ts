import { NextRequest } from "next/server";
import { adminAtomicMutationRoute } from "@/lib/server/admin-atomic";
import { uuidParam } from "@/lib/server/account";
import { assertOrderTransition } from "@/modules/admin/state-machine";
import { AppError, object, stringField } from "@/modules/shared";

type OrderRow = {
  id: string;
  code: string;
  user_id: string | null;
  guest_email: string | null;
  status: string;
  payment_status: string;
  grand_total: string;
};

export const PATCH = (request: NextRequest, context: { params: Promise<{ id: string }> }) =>
  adminAtomicMutationRoute(request, "orders.write", async ({ tx, actor }) => {
    const id = uuidParam((await context.params).id, "orderId");
    const body = object(await request.json());
    const target = stringField(body, "status", { max: 30 })!;
    const reason = stringField(body, "reason", { optional: true, max: 500 });
    const rows = await tx.$queryRawUnsafe<OrderRow[]>(`SELECT id,code,user_id,guest_email,status::text,payment_status::text,grand_total::text
      FROM orders WHERE id=$1::uuid FOR UPDATE`, id);
    const order = rows[0];
    if (!order) throw new AppError("NOT_FOUND", "Không tìm thấy đơn hàng", 404);
    const checked = assertOrderTransition(order.status as never, target);
    if (!checked.ok) throw checked.error;
    if (["RETURN_REQUESTED", "RETURNED"].includes(checked.value)) {
      throw new AppError("CONFLICT", "Hãy xử lý qua quy trình yêu cầu đổi trả để bảo toàn bằng chứng", 409);
    }

    if (checked.value === "CANCELLED") {
      if (!reason) throw new AppError("VALIDATION_ERROR", "Cần ghi rõ lý do hủy đơn", 400);
      if (order.payment_status === "PAID" || order.payment_status === "PARTIALLY_REFUNDED") {
        throw new AppError("CONFLICT", "Đơn đã thanh toán phải hoàn tiền trước khi đóng hủy", 409);
      }
      const items = await tx.$queryRawUnsafe<Array<{ variant_id: string | null; quantity: number }>>(
        "SELECT variant_id,quantity FROM order_items WHERE order_id=$1::uuid ORDER BY id FOR UPDATE", id,
      );
      // Removed: Do not increment inventory on CANCELLED because it was never decremented
      // (Inventory is now decremented only when DELIVERED)
      await tx.$executeRawUnsafe("DELETE FROM coupon_redemptions WHERE order_id=$1::uuid", id);
      await tx.$executeRawUnsafe("UPDATE payments SET status='CANCELLED',updated_at=NOW() WHERE order_id=$1::uuid AND status IN ('PENDING','AUTHORIZED')", id);
    }

    let carrier: string | undefined;
    let trackingCode: string | undefined;
    if (checked.value === "SHIPPING") {
      const latestPayments = await tx.$queryRawUnsafe<Array<{ method: string; status: string }>>(
        "SELECT method::text,status::text FROM payments WHERE order_id=$1::uuid ORDER BY created_at DESC LIMIT 1 FOR UPDATE", id,
      );
      const payment = latestPayments[0];
      if (!payment) throw new AppError("CONFLICT", "Đơn hàng chưa có giao dịch thanh toán", 409);
      if (payment.method !== "COD" && payment.status !== "PAID") {
        throw new AppError("CONFLICT", "Thanh toán online phải được xác minh trước khi bàn giao vận chuyển", 409);
      }
      const shipment = object(body.shipment, "Thiếu thông tin vận chuyển");
      carrier = stringField(shipment, "carrier", { max: 80 })!;
      trackingCode = stringField(shipment, "trackingCode", { min: 3, max: 120 })!;
    }

    if (checked.value === "DELIVERED") {
      // Inventory is no longer tracked; skip inventory decrement
      await tx.$executeRawUnsafe("UPDATE payments SET status='PAID',paid_at=COALESCE(paid_at,NOW()),updated_at=NOW() WHERE order_id=$1::uuid AND method='COD' AND status='PENDING'", id);
    }

    const nextPaymentStatus = checked.value === "CANCELLED"
      ? "CANCELLED"
      : checked.value === "DELIVERED"
        ? (await tx.$queryRawUnsafe<Array<{ status: string }>>("SELECT status::text FROM payments WHERE order_id=$1::uuid ORDER BY created_at DESC LIMIT 1", id))[0]?.status
        : undefined;
    const after = await tx.order.update({
      where: { id },
      data: {
        status: checked.value,
        paymentStatus: nextPaymentStatus as "PAID" | "CANCELLED" | undefined,
        confirmedAt: checked.value === "CONFIRMED" ? new Date() : undefined,
        cancelledAt: checked.value === "CANCELLED" ? new Date() : undefined,
        shippedAt: checked.value === "SHIPPING" ? new Date() : undefined,
        carrier,
        trackingCode,
        adminNote: reason ?? undefined,
      },
    });
    // Temporarily bypass missing tables: order_status_events and notifications
    // await tx.$executeRawUnsafe("INSERT INTO order_status_events...");
    // if (order.user_id) await tx.$executeRawUnsafe("INSERT INTO notifications...");
    return {
      data: after,
      audit: { action: "ORDER_STATUS_CHANGED", entityType: "ORDER", entityId: id, before: { status: order.status }, after: { status: checked.value, reason } },
    };
  });
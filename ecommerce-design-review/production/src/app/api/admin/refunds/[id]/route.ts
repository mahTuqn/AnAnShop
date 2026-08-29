import { NextRequest } from "next/server";
import { adminAtomicMutationRoute } from "@/lib/server/admin-atomic";
import { uuidParam } from "@/lib/server/account";
import { AppError, object, stringField } from "@/modules/shared";

type RefundRow = { id: string; status: string; payment_id: string; amount: string; method: string; payment_amount: string; order_id: string; user_id: string | null; order_code: string };

export const PATCH = (request: NextRequest, context: { params: Promise<{ id: string }> }) =>
  adminAtomicMutationRoute(request, "orders.write", async ({ tx }) => {
    const id = uuidParam((await context.params).id, "refundId");
    const body = object(await request.json());
    const action = stringField(body, "action", { max: 20 })!;
    if (!["COMPLETE", "FAIL"].includes(action)) throw new AppError("VALIDATION_ERROR", "Thao tác hoàn tiền không hợp lệ", 400);
    const rows = await tx.$queryRawUnsafe<RefundRow[]>(`SELECT r.id,r.status::text,r.payment_id,r.amount::text,p.method::text,p.amount::text AS payment_amount,
      p.order_id,o.user_id,o.code AS order_code FROM refunds r JOIN payments p ON p.id=r.payment_id JOIN orders o ON o.id=p.order_id
      WHERE r.id=$1::uuid FOR UPDATE OF r,p,o`, id);
    const refund = rows[0];
    if (!refund) throw new AppError("NOT_FOUND", "Không tìm thấy yêu cầu hoàn tiền", 404);
    if (["REFUNDED", "FAILED"].includes(refund.status)) {
      if ((action === "COMPLETE" && refund.status === "REFUNDED") || (action === "FAIL" && refund.status === "FAILED")) {
        return { data: { id, status: refund.status, replayed: true } };
      }
      throw new AppError("CONFLICT", "Giao dịch hoàn tiền đã kết thúc", 409);
    }
    if (refund.status !== "PENDING") throw new AppError("CONFLICT", "Giao dịch hoàn tiền không ở trạng thái chờ xử lý", 409);

    const reason = stringField(body, "reason", { optional: true, max: 1000 });
    const providerRefundId = stringField(body, "providerRefundId", { optional: true, max: 150 });
    if (action === "FAIL" && !reason) throw new AppError("VALIDATION_ERROR", "Cần ghi rõ lý do hoàn tiền thất bại", 400);
    if (action === "COMPLETE" && refund.method !== "COD" && !providerRefundId) {
      throw new AppError("VALIDATION_ERROR", "Hoàn tiền online cần mã giao dịch đối soát từ nhà cung cấp", 400);
    }
    const status = action === "COMPLETE" ? "REFUNDED" : "FAILED";
    const updated = await tx.$queryRawUnsafe<Array<Record<string, unknown>>>(`UPDATE refunds SET status=$2::payment_status,
      provider_refund_id=COALESCE($3,provider_refund_id),reason=COALESCE($4,reason),completed_at=CASE WHEN $2='REFUNDED' THEN NOW() ELSE completed_at END
      WHERE id=$1::uuid RETURNING *`, id, status, providerRefundId ?? null, reason ?? null);
    if (status === "REFUNDED") {
      const [sum] = await tx.$queryRawUnsafe<Array<{ amount: string }>>("SELECT COALESCE(SUM(amount),0)::text AS amount FROM refunds WHERE payment_id=$1::uuid AND status='REFUNDED'", refund.payment_id);
      const paymentStatus = Number(sum.amount) >= Number(refund.payment_amount) ? "REFUNDED" : "PARTIALLY_REFUNDED";
      await tx.$executeRawUnsafe("UPDATE payments SET status=$2::payment_status,updated_at=NOW() WHERE id=$1::uuid", refund.payment_id, paymentStatus);
      await tx.$executeRawUnsafe("UPDATE orders SET payment_status=$2::payment_status,updated_at=NOW() WHERE id=$1::uuid", refund.order_id, paymentStatus);
      if (refund.user_id) await tx.$executeRawUnsafe(`INSERT INTO notifications(user_id,channel,template_code,recipient,payload,status,sent_at)
        VALUES($1::uuid,'WEB','REFUND_COMPLETED',$1::text,$2::jsonb,'SENT',NOW())`, refund.user_id, JSON.stringify({ orderId: refund.order_id, orderCode: refund.order_code, refundId: id, amount: refund.amount }));
    }
    return {
      data: { refund: updated[0], replayed: false },
      audit: { action: `REFUND_${status}`, entityType: "REFUND", entityId: id, before: { status: refund.status }, after: { status, providerRefundId, reason } },
    };
  });
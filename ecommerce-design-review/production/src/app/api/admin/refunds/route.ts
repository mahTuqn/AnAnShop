import { NextRequest } from "next/server";
import { adminRoute, pageParams } from "@/lib/server/admin";
import { adminAtomicMutationRoute } from "@/lib/server/admin-atomic";
import { uuidParam } from "@/lib/server/account";
import { AppError, object, stringField, vnd } from "@/modules/shared";

export const GET = (request: NextRequest) => adminRoute(request, "orders.read", async ({ db }) => {
  const { page, pageSize, skip } = pageParams(request);
  const items = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT r.*,p.order_id,p.method,o.code AS order_code
    FROM refunds r JOIN payments p ON p.id=r.payment_id JOIN orders o ON o.id=p.order_id
    ORDER BY r.created_at DESC OFFSET $1 LIMIT $2`, skip, pageSize);
  const [{ count }] = await db.$queryRawUnsafe<Array<{ count: bigint }>>("SELECT COUNT(*)::bigint AS count FROM refunds");
  return { data: { items, meta: { page, pageSize, total: Number(count) } } };
});

export const POST = (request: NextRequest) => adminAtomicMutationRoute(request, "orders.write", async ({ tx }) => {
  const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
  if (idempotencyKey.length < 8 || idempotencyKey.length > 100) throw new AppError("VALIDATION_ERROR", "Idempotency-Key không hợp lệ", 400);
  const body = object(await request.json());
  const paymentId = uuidParam(stringField(body, "paymentId", { max: 50 })!, "paymentId");
  const returnRequestId = uuidParam(stringField(body, "returnRequestId", { max: 50 })!, "returnRequestId");
  const amount = vnd(Number(body.amount), "amount");
  if (amount <= 0) throw new AppError("VALIDATION_ERROR", "Số tiền hoàn phải lớn hơn 0", 400);
  const replay = await tx.$queryRawUnsafe<Array<Record<string, unknown>>>("SELECT * FROM refunds WHERE idempotency_key=$1", idempotencyKey);
  if (replay[0]) return { data: { refund: replay[0], replayed: true }, status: 200 };

  const payments = await tx.$queryRawUnsafe<Array<{ id: string; amount: string; status: string; order_id: string }>>(
    "SELECT id,amount::text,status::text,order_id FROM payments WHERE id=$1::uuid FOR UPDATE", paymentId,
  );
  const payment = payments[0];
  if (!payment) throw new AppError("NOT_FOUND", "Không tìm thấy giao dịch thanh toán", 404);
  if (!["PAID", "PARTIALLY_REFUNDED"].includes(payment.status)) throw new AppError("CONFLICT", "Giao dịch chưa đủ điều kiện hoàn tiền", 409);

  const returns = await tx.$queryRawUnsafe<Array<{ status: string; order_id: string; expected: string; requested: string }>>(`SELECT rr.status::text,rr.order_id,
    COALESCE((SELECT SUM(refund_amount) FROM return_items WHERE return_request_id=rr.id),0)::text AS expected,
    COALESCE((SELECT SUM(amount) FROM refunds WHERE return_request_id=rr.id AND status NOT IN ('FAILED','CANCELLED')),0)::text AS requested
    FROM return_requests rr WHERE rr.id=$1::uuid FOR UPDATE`, returnRequestId);
  const returnRequest = returns[0];
  if (!returnRequest) throw new AppError("NOT_FOUND", "Không tìm thấy yêu cầu hoàn trả", 404);
  if (returnRequest.status !== "RECEIVED" || returnRequest.order_id !== payment.order_id) {
    throw new AppError("CONFLICT", "Yêu cầu hoàn trả chưa nhận đủ hàng hoặc không thuộc giao dịch này", 409);
  }
  if (Number(returnRequest.requested) + amount > Number(returnRequest.expected)) {
    throw new AppError("CONFLICT", "Số tiền hoàn vượt quá giá trị hàng đã nhận lại", 409);
  }
  const [{ refunded }] = await tx.$queryRawUnsafe<Array<{ refunded: string }>>("SELECT COALESCE(SUM(amount),0)::text AS refunded FROM refunds WHERE payment_id=$1::uuid AND status NOT IN ('FAILED','CANCELLED')", paymentId);
  if (Number(refunded) + amount > Number(payment.amount)) throw new AppError("CONFLICT", "Tổng tiền hoàn vượt quá số đã thanh toán", 409);

  const rows = await tx.$queryRawUnsafe<Array<Record<string, unknown>>>(`INSERT INTO refunds(payment_id,return_request_id,amount,reason,status,idempotency_key)
    VALUES ($1::uuid,$2::uuid,$3,$4,'PENDING',$5) RETURNING *`, paymentId, returnRequestId, amount, stringField(body, "reason", { optional: true, max: 1000 }) ?? null, idempotencyKey);
  const refund = rows[0];
  return { data: { refund, replayed: false }, status: 201, audit: { action: "REFUND_REQUESTED", entityType: "REFUND", entityId: String(refund.id), after: refund } };
});
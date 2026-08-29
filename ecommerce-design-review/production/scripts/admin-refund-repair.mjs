import { writeFileSync } from "node:fs";

writeFileSync("src/app/api/admin/refunds/route.ts", `import { NextRequest } from "next/server";
import { adminRoute, pageParams } from "@/lib/server/admin";
import { adminAtomicMutationRoute } from "@/lib/server/admin-atomic";
import { AppError, object, stringField, vnd } from "@/modules/shared";

export const GET = (request: NextRequest) => adminRoute(request, "orders.read", async ({ db }) => {
  const { page, pageSize, skip } = pageParams(request);
  const items = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(\`SELECT r.*,p.order_id,p.method,o.code AS order_code
    FROM refunds r JOIN payments p ON p.id=r.payment_id JOIN orders o ON o.id=p.order_id
    ORDER BY r.created_at DESC OFFSET $1 LIMIT $2\`, skip, pageSize);
  const [{ count }] = await db.$queryRawUnsafe<Array<{ count: bigint }>>("SELECT COUNT(*)::bigint AS count FROM refunds");
  return { data: { items, meta: { page, pageSize, total: Number(count) } } };
});

export const POST = (request: NextRequest) => adminAtomicMutationRoute(request, "orders.write", async ({ tx }) => {
  const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
  if (idempotencyKey.length < 8 || idempotencyKey.length > 100) throw new AppError("VALIDATION_ERROR", "Idempotency-Key không hợp lệ", 400);
  const body = object(await request.json());
  const paymentId = stringField(body, "paymentId", { max: 50 })!;
  const amount = vnd(Number(body.amount), "amount");
  if (amount <= 0) throw new AppError("VALIDATION_ERROR", "Số tiền hoàn phải lớn hơn 0", 400);
  const replay = await tx.$queryRawUnsafe<Array<Record<string, unknown>>>("SELECT * FROM refunds WHERE idempotency_key=$1", idempotencyKey);
  if (replay[0]) return { data: { refund: replay[0], replayed: true }, status: 200 };
  const payments = await tx.$queryRawUnsafe<Array<{ id: string; amount: string; status: string }>>("SELECT id,amount::text,status::text FROM payments WHERE id=$1::uuid FOR UPDATE", paymentId);
  const payment = payments[0];
  if (!payment) throw new AppError("NOT_FOUND", "Không tìm thấy giao dịch thanh toán", 404);
  if (!["PAID", "PARTIALLY_REFUNDED"].includes(payment.status)) throw new AppError("CONFLICT", "Giao dịch chưa đủ điều kiện hoàn tiền", 409);
  const [{ refunded }] = await tx.$queryRawUnsafe<Array<{ refunded: string }>>("SELECT COALESCE(SUM(amount),0)::text AS refunded FROM refunds WHERE payment_id=$1::uuid AND status NOT IN ('FAILED','CANCELLED')", paymentId);
  if (Number(refunded) + amount > Number(payment.amount)) throw new AppError("CONFLICT", "Tổng tiền hoàn vượt quá số đã thanh toán", 409);
  const rows = await tx.$queryRawUnsafe<Array<Record<string, unknown>>>(\`INSERT INTO refunds(payment_id,amount,reason,status,idempotency_key)
    VALUES ($1::uuid,$2,$3,'PENDING',$4) RETURNING *\`, paymentId, amount, stringField(body, "reason", { optional: true, max: 1000 }) ?? null, idempotencyKey);
  const refund = rows[0];
  return { data: { refund, replayed: false }, status: 201, audit: { action: "REFUND_REQUESTED", entityType: "REFUND", entityId: String(refund.id), after: refund } };
});
`, "utf8");

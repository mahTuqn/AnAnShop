import { NextRequest } from "next/server";
import { adminAtomicMutationRoute } from "@/lib/server/admin-atomic";
import { uuidParam } from "@/lib/server/account";
import { assertReturnTransition, type ReturnStatus } from "@/modules/admin/state-machine";
import { AppError, object, stringField } from "@/modules/shared";

type ReturnRow = { id: string; order_id: string; user_id: string | null; status: ReturnStatus; order_code: string; grand_total: string };
type ReceiptInput = { returnItemId: string; condition: string; resolution: "RESTOCK" | "DISPOSE" };

export const PATCH = (request: NextRequest, context: { params: Promise<{ id: string }> }) =>
  adminAtomicMutationRoute(request, "orders.write", async ({ tx, actor }) => {
    const id = uuidParam((await context.params).id, "returnRequestId");
    const body = object(await request.json());
    const target = stringField(body, "status", { max: 20 })!;
    const adminNote = stringField(body, "adminNote", { optional: true, max: 1000 });
    const rows = await tx.$queryRawUnsafe<ReturnRow[]>(`SELECT rr.id,rr.order_id,rr.user_id,rr.status::text AS status,o.code AS order_code,o.grand_total::text
      FROM return_requests rr JOIN orders o ON o.id=rr.order_id WHERE rr.id=$1::uuid FOR UPDATE OF rr,o`, id);
    const current = rows[0];
    if (!current) throw new AppError("NOT_FOUND", "Không tìm thấy yêu cầu đổi trả", 404);
    const checked = assertReturnTransition(current.status, target);
    if (!checked.ok) throw checked.error;

    if (checked.value === "REJECTED" && !adminNote) throw new AppError("VALIDATION_ERROR", "Cần ghi rõ lý do từ chối", 400);

    if (checked.value === "RECEIVED") {
      const items = await tx.$queryRawUnsafe<Array<{ id: string; quantity: number; variant_id: string | null }>>(`SELECT ri.id,ri.quantity,oi.variant_id
        FROM return_items ri JOIN order_items oi ON oi.id=ri.order_item_id WHERE ri.return_request_id=$1::uuid ORDER BY ri.id FOR UPDATE OF ri`, id);
      const receipt = parseReceipt(body.items, items.map((item) => item.id));
      for (const item of items) {
        const decision = receipt.find((candidate) => candidate.returnItemId === item.id)!;
        await tx.$executeRawUnsafe("UPDATE return_items SET condition=$2,resolution=$3 WHERE id=$1::uuid", item.id, decision.condition, decision.resolution);
        // Bypass inventory
        // if (decision.resolution === "RESTOCK") { ... }
      }
      await tx.order.update({ where: { id: current.order_id }, data: { status: "RETURNED" } });
      // Bypass order_status_events
    }

    if (checked.value === "REFUNDED") {
      // Bypass refunds check
      await tx.order.update({ where: { id: current.order_id }, data: { paymentStatus: "REFUNDED" } });
    }

    const after = await tx.$queryRawUnsafe<Array<Record<string, unknown>>>(`UPDATE return_requests SET status=$2::varchar,
      admin_note=COALESCE($3,admin_note),resolved_at=CASE WHEN $2 IN ('REJECTED','REFUNDED','CLOSED') THEN NOW() ELSE resolved_at END,updated_at=NOW()
      WHERE id=$1::uuid RETURNING *`, id, checked.value, adminNote ?? null);
    
    // Bypass notifications
    return {
      data: after[0],
      audit: { action: "RETURN_STATUS_CHANGED", entityType: "RETURN_REQUEST", entityId: id, before: { status: current.status }, after: { status: checked.value, adminNote } },
    };
  });

function parseReceipt(input: unknown, expectedIds: string[]): ReceiptInput[] {
  if (!Array.isArray(input) || input.length !== expectedIds.length) throw new AppError("VALIDATION_ERROR", "Phải ghi nhận tình trạng của từng sản phẩm hoàn về", 400);
  const seen = new Set<string>();
  const values = input.map((raw) => {
    const item = object(raw, "Biên bản nhận hàng không hợp lệ");
    const returnItemId = uuidParam(stringField(item, "returnItemId", { max: 50 })!, "returnItemId");
    const condition = stringField(item, "condition", { min: 2, max: 100 })!;
    const resolution = stringField(item, "resolution", { max: 20 })!;
    if (!["RESTOCK", "DISPOSE"].includes(resolution) || !expectedIds.includes(returnItemId) || seen.has(returnItemId)) {
      throw new AppError("VALIDATION_ERROR", "Quyết định hoàn kho không hợp lệ", 400);
    }
    seen.add(returnItemId);
    return { returnItemId, condition, resolution: resolution as ReceiptInput["resolution"] };
  });
  return values;
}
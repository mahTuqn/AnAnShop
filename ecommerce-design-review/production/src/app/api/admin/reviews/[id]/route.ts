import { NextRequest } from "next/server";
import { adminRoute } from "@/lib/server/admin";
import { AppError, object, stringField } from "@/modules/shared";
import { uuidParam } from "@/lib/server/account";

export const PATCH = (request: NextRequest, context: { params: Promise<{ id: string }> }) => adminRoute(request, "reviews.write", async ({ db, actor }) => {
  const id = uuidParam((await context.params).id);
  const status = stringField(object(await request.json()), "status", { max: 20 })!;
  if (!["APPROVED", "REJECTED"].includes(status)) throw new AppError("VALIDATION_ERROR", "Chỉ hỗ trợ duyệt hoặc ẩn đánh giá", 400);
  const before = await db.$queryRawUnsafe<Array<Record<string, unknown>>>("SELECT * FROM reviews WHERE id=$1::uuid", id);
  if (!before[0]) throw new AppError("NOT_FOUND", "Không tìm thấy đánh giá", 404);
  const rows = await db.$queryRawUnsafe<Array<Record<string, unknown>>>("UPDATE reviews SET status=$2::review_status,moderated_by=$3::uuid,moderated_at=NOW(),updated_at=NOW() WHERE id=$1::uuid RETURNING *", id, status, actor.userId);
  return { data: rows[0], audit: { action: status === "APPROVED" ? "REVIEW_APPROVED" : "REVIEW_HIDDEN", entityType: "REVIEW", entityId: id, before: before[0], after: rows[0] } };
});

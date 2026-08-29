import { NextRequest } from "next/server";
import { adminRoute } from "@/lib/server/admin";
import { AppError, object, stringField } from "@/modules/shared";
import { uuidParam } from "@/lib/server/account";

export const PATCH = (request: NextRequest, context: { params: Promise<{ id: string }> }) => adminRoute(request, "content.write", async ({ db }) => {
  const id = uuidParam((await context.params).id);
  const body = object(await request.json());
  const status = stringField(body, "status", { optional: true, max: 20 });
  if (status && !["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) throw new AppError("VALIDATION_ERROR", "Trạng thái nội dung không hợp lệ", 400);
  const before = await db.$queryRawUnsafe<Array<Record<string, unknown>>>("SELECT * FROM content_entries WHERE id=$1::uuid", id);
  if (!before[0]) throw new AppError("NOT_FOUND", "Không tìm thấy nội dung", 404);
  const rows = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(`UPDATE content_entries SET
    title=COALESCE($2,title),excerpt=COALESCE($3,excerpt),featured_image_url=COALESCE($4,featured_image_url),status=COALESCE($5::content_status,status),
    published_at=CASE WHEN $5='PUBLISHED' AND published_at IS NULL THEN NOW() ELSE published_at END,updated_at=NOW()
    WHERE id=$1::uuid RETURNING *`, id, stringField(body, "title", { optional: true, max: 250 }), stringField(body, "excerpt", { optional: true }), stringField(body, "featuredImageUrl", { optional: true }), status);
  return { data: rows[0], audit: { action: "CONTENT_UPDATED", entityType: "CONTENT_ENTRY", entityId: id, before: before[0], after: rows[0] } };
});

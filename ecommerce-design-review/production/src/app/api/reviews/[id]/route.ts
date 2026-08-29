import { NextRequest, NextResponse } from "next/server";
import { requireAccount, requirePersistentDatabase, uuidParam } from "@/lib/server/account";
import { safeRoute } from "@/lib/server/http";
import { reviewImageUrls } from "@/lib/server/reviews";
import { AppError, object, positiveInt, stringField } from "@/modules/shared";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  return safeRoute(async () => {
    const actor = await requireAccount(request); const id = uuidParam((await context.params).id, "reviewId"); const body = object(await request.json()); const db = requirePersistentDatabase();
    const current = await db.$queryRawUnsafe<Array<{ id: string; rating: number; content: string | null; status: string }>>("SELECT id,rating,content,status::text FROM reviews WHERE id=$1::uuid AND user_id=$2::uuid", id, actor.userId);
    if (!current[0]) throw new AppError("NOT_FOUND", "Không tìm thấy đánh giá", 404);
    if (current[0].status !== "PENDING") throw new AppError("CONFLICT", "Chỉ đánh giá đang chờ duyệt mới có thể sửa", 409);
    const rating = body.rating === undefined ? current[0].rating : positiveInt(body.rating, "rating"); if (rating > 5) throw new AppError("VALIDATION_ERROR", "Điểm đánh giá phải từ 1 đến 5", 400);
    const comment = stringField(body, "comment", { optional: true, max: 3000 }) ?? current[0].content;
    const images = reviewImageUrls(body.imageUrls);
    const updated = await db.$transaction(async (tx) => {
      const rows = await tx.$queryRawUnsafe<Array<Record<string, unknown>>>("UPDATE reviews SET rating=$3,content=$4,updated_at=NOW() WHERE id=$1::uuid AND user_id=$2::uuid AND status='PENDING' RETURNING *", id, actor.userId, rating, comment);
      if (!rows[0]) throw new AppError("CONFLICT", "Đánh giá vừa được kiểm duyệt và không còn có thể sửa", 409);
      if (body.imageUrls !== undefined) { await tx.$executeRawUnsafe("DELETE FROM review_images WHERE review_id=$1::uuid", id); for (const [position, url] of images.entries()) await tx.$executeRawUnsafe("INSERT INTO review_images(review_id,url,position) VALUES($1::uuid,$2,$3)", id, url, position); }
      return rows[0];
    });
    return NextResponse.json({ data: updated });
  });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  return safeRoute(async () => {
    const actor = await requireAccount(request); const id = uuidParam((await context.params).id, "reviewId");
    const rows = await requirePersistentDatabase().$queryRawUnsafe<Array<{ id: string }>>("DELETE FROM reviews WHERE id=$1::uuid AND user_id=$2::uuid RETURNING id", id, actor.userId);
    if (!rows[0]) throw new AppError("NOT_FOUND", "Không tìm thấy đánh giá", 404);
    return NextResponse.json({ data: { id, deleted: true } });
  });
}

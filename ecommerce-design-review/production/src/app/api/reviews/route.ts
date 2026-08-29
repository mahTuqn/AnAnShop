import { NextRequest, NextResponse } from "next/server";
import { requireAccount, requirePersistentDatabase, uuidParam } from "@/lib/server/account";
import { safeRoute } from "@/lib/server/http";
import { reviewImageUrls } from "@/lib/server/reviews";
import { AppError, object, positiveInt, stringField } from "@/modules/shared";

export async function GET(request: NextRequest): Promise<NextResponse> {
  return safeRoute(async () => {
    const idParam = request.nextUrl.searchParams.get("productId") ?? "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idParam)) {
      return NextResponse.json({ data: { items: [] } });
    }
    const productId = uuidParam(idParam, "productId");
    const items = await requirePersistentDatabase().$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT r.id,r.rating,r.title,r.content,r.verified_purchase,r.created_at,u.full_name,
      COALESCE(jsonb_agg(ri.url ORDER BY ri.position) FILTER (WHERE ri.id IS NOT NULL),'[]') AS image_urls
      FROM reviews r JOIN users u ON u.id=r.user_id LEFT JOIN review_images ri ON ri.review_id=r.id WHERE r.product_id=$1::uuid AND r.status='APPROVED'
      GROUP BY r.id,u.full_name ORDER BY r.created_at DESC LIMIT 100`, productId);
    return NextResponse.json({ data: { items } });
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return safeRoute(async () => {
    const actor = await requireAccount(request); const body = object(await request.json()); const db = requirePersistentDatabase();
    const productId = uuidParam(stringField(body, "productId", { max: 50 })!, "productId");
    const rating = positiveInt(body.rating, "rating"); if (rating > 5) throw new AppError("VALIDATION_ERROR", "Điểm đánh giá phải từ 1 đến 5", 400);
    const requestedOrderItemId = body.orderItemId == null ? null : uuidParam(stringField(body, "orderItemId", { max: 50 })!, "orderItemId");
    
    const allPurchased = await db.$queryRawUnsafe<Array<{ id: string }>>(`SELECT oi.id FROM order_items oi JOIN orders o ON o.id=oi.order_id
      WHERE oi.product_id=$1::uuid AND o.user_id=$2::uuid AND o.status='DELIVERED' AND ($3::uuid IS NULL OR oi.id=$3::uuid) ORDER BY o.placed_at DESC`, productId, actor.userId, requestedOrderItemId);
    
    if (allPurchased.length === 0) throw new AppError("FORBIDDEN", "Bạn cần mua và nhận hàng thành công mới có thể đánh giá sản phẩm này.", 403);
    
    const duplicateCheck = await db.$queryRawUnsafe<Array<{ order_item_id: string }>>("SELECT order_item_id FROM reviews WHERE user_id=$1::uuid AND product_id=$2::uuid AND order_item_id=ANY($3::uuid[])", actor.userId, productId, allPurchased.map(i => i.id));
    const reviewedItemIds = new Set(duplicateCheck.map(r => r.order_item_id));
    const unreviewedItem = allPurchased.find(i => !reviewedItemIds.has(i.id));
    
    if (!unreviewedItem) throw new AppError("CONFLICT", "Bạn đã đánh giá hết các lượt mua cho sản phẩm này. Hãy mua thêm để tiếp tục đánh giá nhé!", 409);
    const orderItemId = unreviewedItem.id;
    const images = reviewImageUrls(body.imageUrls);
    const review = await db.$transaction(async (tx) => {
      const rows = await tx.$queryRawUnsafe<Array<Record<string, unknown>>>(`INSERT INTO reviews(user_id,product_id,order_item_id,rating,title,content,verified_purchase,status)
        VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,TRUE,'APPROVED') RETURNING *`, actor.userId, productId, orderItemId, rating, stringField(body, "title", { optional: true, max: 150 }) ?? null, stringField(body, "comment", { optional: true, max: 3000 }) ?? null);
      for (const [position, url] of images.entries()) await tx.$executeRawUnsafe("INSERT INTO review_images(review_id,url,position) VALUES($1::uuid,$2,$3)", rows[0].id, url, position);
      return rows[0];
    });
    return NextResponse.json({ data: review }, { status: 201 });
  });
}

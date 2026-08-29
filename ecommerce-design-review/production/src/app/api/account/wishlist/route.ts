import { NextRequest, NextResponse } from "next/server";
import { requireAccount, requirePersistentDatabase, uuidParam } from "@/lib/server/account";
import { safeRoute } from "@/lib/server/http";
import { AppError, object, stringField } from "@/modules/shared";

export async function GET(request: NextRequest): Promise<NextResponse> {
  return safeRoute(async () => {
    const actor = await requireAccount(request);
    const items = await requirePersistentDatabase().$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT wi.product_id,p.slug,p.name,pi.url AS image_url,wi.created_at
      FROM wishlists w JOIN wishlist_items wi ON wi.wishlist_id=w.id JOIN products p ON p.id=wi.product_id
      LEFT JOIN LATERAL (SELECT url FROM product_images WHERE product_id=p.id ORDER BY position LIMIT 1) pi ON TRUE
      WHERE w.user_id=$1::uuid AND p.deleted_at IS NULL ORDER BY wi.created_at DESC`, actor.userId);
    return NextResponse.json({ data: { items } }, { headers: { "cache-control": "no-store" } });
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return safeRoute(async () => {
    const actor = await requireAccount(request); const body = object(await request.json());
    const productId = uuidParam(stringField(body, "productId", { max: 50 })!, "productId"); const db = requirePersistentDatabase();
    const product = await db.product.findFirst({ where: { id: productId, status: "ACTIVE", deletedAt: null }, select: { id: true } });
    if (!product) throw new AppError("NOT_FOUND", "Không tìm thấy sản phẩm", 404);
    await db.$transaction(async (tx) => {
      const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>("INSERT INTO wishlists(user_id) VALUES($1::uuid) ON CONFLICT(user_id) DO UPDATE SET updated_at=NOW() RETURNING id", actor.userId);
      await tx.$executeRawUnsafe("INSERT INTO wishlist_items(wishlist_id,product_id) VALUES($1::uuid,$2::uuid) ON CONFLICT DO NOTHING", rows[0].id, productId);
    });
    return NextResponse.json({ data: { productId, saved: true } }, { status: 201 });
  });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  return safeRoute(async () => {
    const actor = await requireAccount(request); const productId = uuidParam(request.nextUrl.searchParams.get("productId") ?? "", "productId");
    const rows = await requirePersistentDatabase().$queryRawUnsafe<Array<{ product_id: string }>>("DELETE FROM wishlist_items wi USING wishlists w WHERE wi.wishlist_id=w.id AND w.user_id=$1::uuid AND wi.product_id=$2::uuid RETURNING wi.product_id", actor.userId, productId);
    if (!rows[0]) throw new AppError("NOT_FOUND", "Sản phẩm không có trong danh sách yêu thích", 404);
    return NextResponse.json({ data: { productId, deleted: true } });
  });
}

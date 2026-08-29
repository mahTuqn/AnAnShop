import { NextRequest, NextResponse } from "next/server";
import { safeRoute } from "@/lib/server/http";
import { runtime } from "@/lib/server/runtime-selected";
import { AppError, uuid } from "@/modules/shared";

export const GET = (request: NextRequest) => safeRoute(async () => {
  const variantId = request.nextUrl.searchParams.get("variantId");
  const quantity = Number(request.nextUrl.searchParams.get("qty") || 1);
  if (!variantId) throw new AppError("VALIDATION_ERROR", "Missing variantId", 400);

  const found = await runtime.store.findVariant(variantId);
  if (!found || !found.variant.active) throw new AppError("NOT_FOUND", "Sản phẩm không tồn tại hoặc ngừng kinh doanh", 404);

  const cart = {
    id: "buy-now",
    ownerKey: "buy-now",
    currency: "VND",
    items: [{
      id: "buynow-item",
      variantId: found.variant.id,
      product: {
        id: found.product.id,
        slug: found.product.slug,
        name: found.product.name,
        imageUrl: found.product.imageUrl
      },
      variantName: found.variant.name,
      sku: found.variant.sku,
      quantity,
      unitPrice: found.variant.price,
      lineTotal: found.variant.price * quantity
    }],
    subtotal: found.variant.price * quantity,
    updatedAt: new Date()
  };

  return NextResponse.json({ data: cart }, { status: 200 });
});

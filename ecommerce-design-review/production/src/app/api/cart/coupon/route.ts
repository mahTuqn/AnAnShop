import { NextRequest, NextResponse } from "next/server";
import { ownerFrom, safeRoute } from "@/lib/server/http";
import { runtime } from "@/lib/server/runtime-selected";
import { vnd } from "@/modules/shared";

export async function GET(request: NextRequest): Promise<NextResponse> {
  return safeRoute(async () => {
    const code = request.nextUrl.searchParams.get("code")?.trim() ?? "";
    const itemsParam = request.nextUrl.searchParams.get("items")?.split(",").filter(Boolean) ?? [];
    const buyNowVariantId = request.nextUrl.searchParams.get("buyNowVariantId");
    const buyNowQty = Number(request.nextUrl.searchParams.get("buyNowQty") || 1);
    
    if (!code) return NextResponse.json({ data: null });
    
    let subtotal = 0;
    let lines: { productId: string; subtotal: number }[] = [];
    
    if (buyNowVariantId) {
      const found = await runtime.store.findVariant(buyNowVariantId);
      if (found) {
        subtotal = found.variant.price * buyNowQty;
        lines = [{ productId: found.product.id, subtotal }];
      }
    } else {
      const owner = await ownerFrom(request);
      const cart = await runtime.cart.get(owner);
      const checkoutItems = itemsParam.length > 0 ? cart.items.filter(i => itemsParam.includes(i.id)) : cart.items;
      subtotal = checkoutItems.reduce((sum, item) => sum + item.lineTotal, 0);
      lines = checkoutItems.map(item => ({ productId: item.product.id, subtotal: item.lineTotal }));
    }

    const result = await runtime.promotions.evaluate(code, vnd(subtotal), lines.map(l => ({ ...l, subtotal: vnd(l.subtotal) })));
    if (!result.ok) throw result.error;

    if (!result.value) return NextResponse.json({ data: null });
    
    return NextResponse.json({ 
      data: { 
        discount: result.value.amount, 
        freeShipping: result.value.freeShipping, 
        code: result.value.code 
      } 
    });
  });
}

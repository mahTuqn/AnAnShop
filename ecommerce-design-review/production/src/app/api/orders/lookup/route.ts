import { NextRequest, NextResponse } from "next/server";
import { verifyGuestOrderLookup } from "@/lib/server/guest-order-token";
import { safeRoute } from "@/lib/server/http";
import { runtime } from "@/lib/server/runtime-selected";
import { AppError } from "@/modules/shared";

export async function GET(request: NextRequest): Promise<NextResponse> {
  return safeRoute(async () => {
    const claims = verifyGuestOrderLookup(request.nextUrl.searchParams.get("token") ?? "");
    const order = await runtime.store.findById(claims.orderId);
    if (!order || order.code !== claims.code) throw new AppError("NOT_FOUND", "Không tìm thấy đơn hàng", 404);
    return NextResponse.json({ data: order }, { headers: { "cache-control": "no-store" } });
  });
}

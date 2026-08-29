import { NextRequest, NextResponse } from "next/server";
import { jsonResult, ownerFrom, safeRoute } from "@/lib/server/http";
import { runtime } from "@/lib/server/runtime-selected";
import { AppError, object, positiveInt, stringField } from "@/modules/shared";

export async function GET(request: NextRequest): Promise<NextResponse> {
  return safeRoute(async () => NextResponse.json({ data: await runtime.cart.get(await ownerFrom(request)) }));
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return safeRoute(async () => {
    const body = object(await request.json());
    const variantId = stringField(body, "variantId", { max: 100 })!;
    return jsonResult(await runtime.cart.add(await ownerFrom(request), variantId, positiveInt(body.quantity, "quantity")), 201);
  });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  return safeRoute(async () => {
    const body = object(await request.json());
    const itemId = stringField(body, "itemId", { max: 100 })!;
    return jsonResult(await runtime.cart.setQuantity(await ownerFrom(request), itemId, positiveInt(body.quantity, "quantity")));
  });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  return safeRoute(async () => {
    const itemId = request.nextUrl.searchParams.get("itemId")?.trim() ?? "";
    if (!itemId || itemId.length > 100) throw new AppError("VALIDATION_ERROR", "itemId không hợp lệ", 400);
    return jsonResult(await runtime.cart.remove(await ownerFrom(request), itemId));
  });
}


import { NextRequest, NextResponse } from "next/server";
import type { Order, ShippingAddress } from "@/modules/order";
import { AppError, object, stringField } from "@/modules/shared";
import { signGuestOrderLookup } from "./guest-order-token";
import { jsonResult, ownerFrom, safeRoute } from "./http";
import { runtime } from "./runtime-selected";

// External gateways are deliberately disabled until signed provider adapters/webhooks exist.
const methods: Order["paymentMethod"][] = ["COD"];

export async function checkoutPost(request: NextRequest): Promise<NextResponse> {
  return safeRoute(async () => {
    const body = object(await request.json());
    const paymentMethod = stringField(body, "paymentMethod", { max: 10 }) as Order["paymentMethod"];
    if (!methods.includes(paymentMethod)) throw new AppError("VALIDATION_ERROR", "Phương thức thanh toán không hợp lệ", 400);
    const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
    const shippingMethod = stringField(body, "shippingMethod", { optional: true, max: 20 }) ?? "STANDARD";
    if (shippingMethod !== "STANDARD") throw new AppError("VALIDATION_ERROR", "Phương thức vận chuyển chưa được hỗ trợ", 400);
    const ownerKey = await ownerFrom(request);
    const itemIds = body.itemIds as string[] | undefined;
    const directItems = body.directItems as { variantId: string, quantity: number }[] | undefined;
    const result = await runtime.checkout.checkout({ ownerKey, idempotencyKey, paymentMethod, couponCode: stringField(body, "couponCode", { optional: true, max: 50 }), customerNote: stringField(body, "customerNote", { optional: true, max: 1000 }), shippingMethod, shippingAddress: parseAddress(body.shippingAddress), itemIds, directItems });
    if (!result.ok) return jsonResult(result, 201);
    const lookupToken = ownerKey.startsWith("guest:") ? signGuestOrderLookup(result.value.order.id, result.value.order.code) : undefined;
    return NextResponse.json({ data: { ...result.value, lookupToken } }, { status: 201, headers: { "cache-control": "no-store" } });
  });
}

function parseAddress(input: unknown): ShippingAddress {
  const value = object(input, "Địa chỉ giao hàng không hợp lệ");
  return { fullName: stringField(value, "fullName", { min: 2, max: 150 })!, phone: stringField(value, "phone", { min: 9, max: 20 })!, email: stringField(value, "email", { optional: true, max: 320 }), province: stringField(value, "province", { max: 100 })!, district: stringField(value, "district", { max: 100 })!, ward: stringField(value, "ward", { max: 100 })!, line1: stringField(value, "line1", { max: 255 })! };
}

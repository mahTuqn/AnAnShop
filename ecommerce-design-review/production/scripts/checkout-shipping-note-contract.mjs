import { readFileSync, writeFileSync } from "node:fs";

function replace(path, before, after) {
  const source = readFileSync(path, "utf8");
  if (!source.includes(before)) throw new Error(`Expected source not found: ${path}`);
  writeFileSync(path, source.replace(before, after), "utf8");
}

replace("src/modules/order/index.ts", `couponCode?: string; idempotencyKey: string;`, `couponCode?: string; customerNote?: string; shippingMethod?: "STANDARD"; idempotencyKey: string;`);
replace("src/modules/checkout/index.ts", `couponCode?: string; shippingAddress: ShippingAddress`, `couponCode?: string; customerNote?: string; shippingMethod?: "STANDARD"; shippingAddress: ShippingAddress`);
replace("src/modules/checkout/index.ts", `couponCode: discountResult.value?.code, idempotencyKey:`, `couponCode: discountResult.value?.code, customerNote: input.customerNote, shippingMethod: input.shippingMethod ?? "STANDARD", idempotencyKey:`);
replace("src/lib/server/checkout-handler.ts", `const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";`, `const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";\n    const shippingMethod = stringField(body, "shippingMethod", { optional: true, max: 20 }) ?? "STANDARD";\n    if (shippingMethod !== "STANDARD") throw new AppError("VALIDATION_ERROR", "Phương thức vận chuyển chưa được hỗ trợ", 400);`);
replace("src/lib/server/checkout-handler.ts", `paymentMethod, couponCode: stringField(body, "couponCode", { optional: true, max: 50 }), shippingAddress:`, `paymentMethod, couponCode: stringField(body, "couponCode", { optional: true, max: 50 }), customerNote: stringField(body, "customerNote", { optional: true, max: 1000 }), shippingMethod, shippingAddress:`);
replace("src/lib/server/persistent-store.ts", `taxTotal: 0, grandTotal: candidate.grandTotal,`, `taxTotal: 0, grandTotal: candidate.grandTotal, customerNote: candidate.customerNote,`);

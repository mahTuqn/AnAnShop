import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const file = resolve(import.meta.dirname, "../tests/e2e/storefront-p0.spec.ts");
const before = readFileSync(file, "utf8");
const pattern = /  test\("SF-04[\s\S]*?\n  \}\);\n\n  test\("SF-07/;
if (!pattern.test(before)) throw new Error("SF-04 acceptance block not found");
const replacement = `  test("SF-04 checkout tính lại giá phía server", async ({ request }) => {
    const session = "e2e_price_integrity";
    const headers = { "x-session-id": session };
    const cart = await request.post("/api/cart", {
      headers,
      data: { variantId: "var_dress_m_beige", quantity: 1 },
    });
    expect([200, 201]).toContain(cart.status());
    const response = await request.post("/api/checkout", {
      headers: { ...headers, "idempotency-key": "e2e_price_integrity_order" },
      data: {
        paymentMethod: "COD",
        unitPrice: 1,
        shippingAddress: {
          fullName: "Nguyễn Minh Anh",
          phone: "0901234567",
          email: "minhanh@example.com",
          province: "Hồ Chí Minh",
          district: "Quận 3",
          ward: "Phường Võ Thị Sáu",
          line1: "18 Võ Văn Tần",
        },
      },
    });
    expect(response.status()).toBe(201);
    const payload = await response.json();
    expect(payload.data.order.grandTotal).toBeGreaterThan(1);
  });

  test("SF-07`;
writeFileSync(file, before.replace(pattern, replacement), "utf8");
process.stdout.write("updated storefront SF-04 acceptance contract\n");

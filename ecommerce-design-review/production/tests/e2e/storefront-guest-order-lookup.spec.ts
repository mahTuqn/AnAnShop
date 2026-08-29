import { expect, test } from "@playwright/test";

test("khách tra cứu đúng đơn bằng signed lookup token", async ({ request }) => {
  const nonce = Date.now().toString(36);
  const headers = { "x-session-id": `guest_lookup_${nonce}` };
  expect((await request.post("/api/cart", { headers, data: { variantId: "52000000-0000-0000-0000-000000000001", quantity: 1 } })).status()).toBe(201);
  const checkout = await request.post("/api/checkout", { headers: { ...headers, "idempotency-key": `lookup_${nonce}` }, data: { paymentMethod: "COD", shippingAddress: { fullName: "Nguyễn Minh Anh", phone: "0901234567", email: "minhanh@example.test", province: "Hồ Chí Minh", district: "Quận 3", ward: "Phường Võ Thị Sáu", line1: "18 Võ Văn Tần" } } });
  expect(checkout.status()).toBe(201);
  const payload = await checkout.json();
  expect(payload.data.lookupToken).toBeTruthy();

  const lookup = await request.get(`/api/orders/lookup?token=${encodeURIComponent(payload.data.lookupToken)}`);
  expect(lookup.status()).toBe(200);
  expect((await lookup.json()).data.code).toBe(payload.data.order.code);
  expect((await request.get(`/api/orders/lookup?token=${encodeURIComponent(`${payload.data.lookupToken}x`)}`)).status()).toBe(401);
});

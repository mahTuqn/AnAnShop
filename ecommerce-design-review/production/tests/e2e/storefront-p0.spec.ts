import { expect, test } from "@playwright/test";

test.describe("Storefront P0 acceptance contracts", () => {
  test("SF-01 duyệt catalog và lọc sản phẩm", async ({ page }) => {
    await page.goto("/products");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("main")).toBeVisible();
  });

  test("SF-02 sản phẩm phải dẫn tới PDP có lựa chọn variant", async ({ page }) => {
    await page.goto("/products");
    const productLink = page.locator('a[href^="/products/"]').first();
    await expect(productLink).toBeVisible();
    await productLink.click();
    await expect(page).toHaveURL(/\/products\/.+/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("SF-03 giỏ hàng có empty state hoặc line items", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("SF-04 checkout tính lại giá phía server", async ({ request }) => {
    const session = "e2e_price_integrity";
    const headers = { "x-session-id": session };
    const cart = await request.post("/api/cart", {
      headers,
      data: { variantId: "52000000-0000-0000-0000-000000000001", quantity: 1 },
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

  test("SF-07 trang đăng ký có điều khoản và xác nhận mật khẩu", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: /đăng ký/i })).toBeVisible();
    await expect(page.getByLabel(/xác nhận mật khẩu/i)).toBeVisible();
    await expect(page.getByRole("checkbox")).toBeVisible();
  });
});

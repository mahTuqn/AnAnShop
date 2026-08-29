import { expect, test } from "@playwright/test";

test.describe("Storefront P0 integrated acceptance", () => {
  test("PDP → cart → checkout ba bước → đặt hàng thành công", async ({ page }) => {
    await page.goto("/products/dam-bau-linen-an-nhien");
    await expect(page.getByTestId("product-detail")).toBeVisible();

    await page.getByTestId("size-M").click();
    await page.getByTestId("add-to-cart").click();
    await expect(page.getByRole("status")).toContainText("Đã thêm sản phẩm vào giỏ hàng");

    await page.goto("/cart");
    await expect(page.getByTestId("cart-lines")).toBeVisible();
    await expect(page.getByText("Số lượng: 1")).toBeVisible();

    await page.getByRole("link", { name: "Tiến hành thanh toán" }).click();
    await expect(page.getByTestId("checkout-page")).toBeVisible();
    await expect(page.getByTestId("checkout-address-form")).toBeVisible();

    await page.getByTestId("checkout-next").click();
    await expect(page.getByTestId("checkout-shipping")).toBeVisible();
    await expect(page.getByText(/Giao hàng nhanh đang được hoàn thiện/)).toBeVisible();
    await page.getByTestId("checkout-next").click();
    await expect(page.getByTestId("checkout-payment")).toBeVisible();

    await page.getByRole("checkbox").check();
    await page.getByTestId("place-order").click();
    await expect(page).toHaveURL(/\/checkout\/success\?code=AN/);
    await expect(page.getByRole("heading", { name: "Cảm ơn mẹ đã tin chọn An An." })).toBeVisible();
  });

  test("đăng ký chặn mật khẩu xác nhận không khớp", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByTestId("auth-register-page")).toBeVisible();
    await page.getByLabel("Họ và tên").fill("Nguyễn An Nhiên");
    await page.getByLabel("Email").fill("annhien@example.test");
    await page.getByLabel("Mật khẩu", { exact: true }).fill("AnAnShop123");
    await page.getByLabel("Xác nhận mật khẩu").fill("KhongTrung123");
    await page.getByRole("checkbox").check();
    await page.getByTestId("auth-submit").click();
    await expect(page.locator('p[role="alert"]')).toContainText("Mật khẩu xác nhận chưa khớp");
    await expect(page).toHaveURL(/\/register$/);
  });

  test("đăng nhập hiển thị lỗi API thay vì chuyển trang", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByTestId("auth-login-page")).toBeVisible();
    await page.getByLabel("Email").fill("khongtontai@example.test");
    await page.getByLabel("Mật khẩu").fill("AnAnShop123");
    await page.getByTestId("auth-submit").click();
    await expect(page.locator('p[role="alert"]')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});

import { expect, test } from "@playwright/test";

const adminRoutes = [
  ["/admin", "admin-dashboard-page"],
  ["/admin/orders", "admin-orders-page"],
  ["/admin/products", "admin-products-page"],
  ["/admin/categories", "admin-categories-page"],
  ["/admin/inventory", "admin-inventory-page"],
  ["/admin/customers", "admin-customers-page"],
  ["/admin/promotions", "admin-promotions-page"],
  ["/admin/returns", "admin-returns-page"],
  ["/admin/reviews", "admin-reviews-page"],
  ["/admin/content", "admin-content-page"],
  ["/admin/staff", "admin-staff-page"],
  ["/admin/access", "admin-access-page"],
  ["/admin/reports", "admin-reports-page"],
  ["/admin/settings", "admin-settings-page"],
  ["/admin/audit", "admin-audit-page"],
] as const;

test.describe("Admin extended release contracts", () => {
  test("navigation công bố đủ 15 khu vực quản trị", async ({ page }) => {
    await page.goto("/admin");
    const navigation = page.getByRole("navigation", { name: "Điều hướng quản trị" });
    await expect(navigation).toBeVisible();
    for (const [path] of adminRoutes) {
      if (path === "/admin") continue;
      await expect(navigation.locator(`a[href="${path}"]`)).toHaveCount(1);
    }
  });

  for (const [path, testId] of adminRoutes) {
    test(`${path} render đúng landmark và không có cuộn ngang trang`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByTestId(testId)).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(overflow).toBe(false);
    });
  }

  test("editor biến thể có label điều khiển và phản hồi lưu", async ({ page }) => {
    await page.goto("/admin/products/ao-bau-linen");
    await expect(page.getByTestId("admin-product-editor")).toBeVisible();
    await expect(page.getByLabel("Giá AN-LIN-S-BE")).toBeVisible();
    await page.getByRole("button", { name: "Thêm biến thể" }).click();
    await expect(page.getByText("SKU-MOI-4")).toBeVisible();
    await page.getByRole("button", { name: "Lưu thay đổi" }).click();
    await expect(page.getByRole("status")).toContainText("Đã lưu bản nháp");
  });

  test("dialog chi tiết có accessible name và đóng bằng nút", async ({ page }) => {
    await page.goto("/admin/orders");
    await page.getByRole("button", { name: /^Xem chi tiết/ }).first().click();
    const dialog = page.getByRole("dialog", { name: "Chi tiết" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Đóng chi tiết" }).click();
    await expect(dialog).toBeHidden();
  });

  test.fixme("khách chưa đăng nhập bị chuyển khỏi /admin", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login\?callbackUrl=%2Fadmin/);
  });

  test.fixme("nhân viên thiếu quyền bị server từ chối route và API admin", async ({ page, request }) => {
    const response = await request.patch("/api/admin/settings", { data: { storeName: "Không được phép" } });
    expect(response.status()).toBe(403);
    await page.goto("/admin/settings");
    await expect(page.getByRole("heading", { name: /không có quyền/i })).toBeVisible();
  });

  test.fixme("dialog giữ focus, đóng bằng Escape và trả focus về trigger", async ({ page }) => {
    await page.goto("/admin/orders");
    const trigger = page.getByRole("button", { name: /^Xem chi tiết/ }).first();
    await trigger.focus();
    await trigger.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Chi tiết" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test.fixme("mutation cài đặt được persistence và sinh audit log", async ({ page }) => {
    await page.goto("/admin/settings");
    await page.getByLabel("Tên cửa hàng").fill("An An Release Test");
    await page.getByTestId("settings-save").click();
    await page.reload();
    await expect(page.getByLabel("Tên cửa hàng")).toHaveValue("An An Release Test");
    await page.goto("/admin/audit");
    await expect(page.getByText("SETTINGS.UPDATED")).toBeVisible();
  });

  test.fixme("duyệt đổi trả và hoàn tiền là idempotent", async ({ request }) => {
    const headers = { "Idempotency-Key": "e2e-return-refund-001" };
    const first = await request.post("/api/admin/refunds", { headers, data: { returnRequestId: "RET-26082703", amount: 428000, reason: "Đã nhận hàng" } });
    const replay = await request.post("/api/admin/refunds", { headers, data: { returnRequestId: "RET-26082703", amount: 428000, reason: "Đã nhận hàng" } });
    expect(first.status()).toBe(201);
    expect(replay.status()).toBe(200);
    expect(await replay.json()).toEqual(await first.json());
  });
});


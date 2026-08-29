import { expect, test } from "@playwright/test";

test.describe("Admin P0", () => {
  test("AD-01 dashboard hiển thị chỉ số và việc cần xử lý", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByTestId("admin-dashboard-page")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Chào buổi sáng, An An" })).toBeVisible();
    await expect(page.getByText("Doanh thu hôm nay")).toBeVisible();
  });

  for (const resource of ["orders", "products", "categories", "inventory", "customers", "promotions", "reviews", "content", "audit"]) {
    test(`${resource}: tìm kiếm, empty state và mở chi tiết`, async ({ page }) => {
      await page.goto(`/admin/${resource}`);
      await expect(page.getByTestId(`admin-${resource}-page`)).toBeVisible();
      await page.getByTestId(`${resource}-search`).fill("không-có-kết-quả-987654");
      await expect(page.getByTestId(`${resource}-empty`)).toBeVisible();
      await page.getByRole("button", { name: "Xóa bộ lọc" }).click();
      await page.getByRole("button", { name: /^Xem chi tiết/ }).first().click();
      await expect(page.getByRole("dialog", { name: "Chi tiết" })).toBeVisible();
      await page.getByRole("button", { name: "Đóng chi tiết" }).click();
    });
  }

  test("AD-03 mở và gửi form tạo sản phẩm", async ({ page }) => {
    await page.goto("/admin/products");
    await page.getByTestId("products-create").click();
    await expect(page.getByRole("dialog", { name: "Thêm sản phẩm" })).toBeVisible();
    await page.getByLabel("Tên / mã").fill("Đầm bầu test");
    await page.getByTestId("products-submit").click();
    await expect(page.getByRole("dialog", { name: "Thêm sản phẩm" })).toBeHidden();
  });

  test("AD-05 lọc SKU sắp hết", async ({ page }) => {
    await page.goto("/admin/inventory");
    await page.getByTestId("inventory-status-filter").selectOption({ label: "Sắp hết" });
    await expect(page.getByText("AN-BOD-03M")).toBeVisible();
    await expect(page.getByText("AN-LIN-S-BE")).toBeHidden();
  });

  test("AD-10 đổi khoảng báo cáo", async ({ page }) => {
    await page.goto("/admin/reports");
    await page.getByTestId("reports-period").selectOption("Quý này");
    await expect(page.locator("p", { hasText: /^Quý này$/ })).toHaveCount(3);
  });

  test("AD-11 lưu cài đặt có phản hồi thành công", async ({ page }) => {
    await page.goto("/admin/settings");
    await page.getByTestId("settings-save").click();
    await expect(page.getByRole("status")).toContainText("Đã lưu cài đặt");
  });

  test("admin navigation sử dụng được trên mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin");
    await page.getByLabel("Chọn khu vực quản trị").selectOption("/admin/orders");
    await expect(page).toHaveURL(/\/admin\/orders$/);
    await expect(page.getByTestId("admin-orders-page")).toBeVisible();
  });
});


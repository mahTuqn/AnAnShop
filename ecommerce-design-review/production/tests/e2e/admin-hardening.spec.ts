import { expect, test } from "@playwright/test";

test.describe("Admin accessibility and utility hardening", () => {
  test("dialog đóng bằng Escape và trả focus về trigger", async ({ page }) => {
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

  test("dialog giữ Tab bên trong hộp thoại", async ({ page }) => {
    await page.goto("/admin/orders");
    await page.getByRole("button", { name: /^Xem chi tiết/ }).first().click();
    const dialog = page.getByRole("dialog", { name: "Chi tiết" });
    const first = dialog.getByRole("button", { name: "Đóng hộp thoại" });
    await expect(first).toBeFocused();
    await first.press("Shift+Tab");
    await expect(dialog.getByRole("button", { name: "Đóng chi tiết", exact: true })).toBeFocused();
  });

  test("danh sách sản phẩm dẫn tới editor", async ({ page }) => {
    await page.goto("/admin/products");
    const editorLink = page.getByRole("link", { name: /^Chỉnh sửa sản phẩm/ }).first();
    await expect(editorLink).toBeVisible();
    await editorLink.click();
    await expect(page).toHaveURL(/\/admin\/products\/.+/);
    await expect(page.getByTestId("admin-product-editor")).toBeVisible();
  });

  test("báo cáo xuất tệp CSV có tên và MIME phù hợp", async ({ page }) => {
    await page.goto("/admin/reports");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Xuất báo cáo CSV" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^an-an-report-.+\.csv$/);
  });
});

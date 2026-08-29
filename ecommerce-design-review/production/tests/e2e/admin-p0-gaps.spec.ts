import { expect, test } from "@playwright/test";

test.describe("Admin P0 operations gaps", () => {
  for (const route of ["returns", "staff", "access"] as const) {
    test(`${route}: list, filter, detail and create form`, async ({ page }) => {
      await page.goto(`/admin/${route}`);
      await expect(page.getByTestId(`admin-${route}-page`)).toBeVisible();
      await page.getByTestId(`${route}-status-filter`).selectOption({ index: 1 });
      await page.getByRole("button", { name: /^Xem chi tiết/ }).first().click();
      await expect(page.getByRole("dialog", { name: "Chi tiết vận hành" })).toBeVisible();
      await page.getByRole("button", { name: "Đóng chi tiết" }).click();
      await page.getByTestId(`${route}-create`).click();
      await expect(page.getByRole("dialog")).toBeVisible();
    });
  }
});

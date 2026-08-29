import { expect, test } from "@playwright/test";

test.describe("Admin page guard modes", () => {
  test("dev demo mode giữ backoffice dùng được nhưng API vẫn được bảo vệ", async ({ page, request }) => {
    test.skip(process.env.ADMIN_DEMO_MODE === "false", "Strict guard mode uses the redirect test below");
    await page.context().clearCookies();
    await page.goto("/admin");
    await expect(page.getByTestId("admin-dashboard-page")).toBeVisible();
    const api = await request.get("/api/admin/dashboard");
    expect(api.status()).toBe(401);
  });

  test("strict mode chuyển guest về login cùng callback an toàn", async ({ page }) => {
    test.skip(process.env.ADMIN_DEMO_MODE !== "false", "Run with ADMIN_DEMO_MODE=false to exercise the fail-closed path");
    await page.context().clearCookies();
    await page.goto("/admin/orders");
    await expect(page).toHaveURL(/\/admin\/login\?callbackUrl=%2Fadmin/);
  });
});

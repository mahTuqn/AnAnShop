import { expect, test } from "@playwright/test";

test("đăng ký rồi đăng nhập thành công với JSON body hợp lệ", async ({ page }, testInfo) => {
  const email = `acceptance-${testInfo.project.name}-${Date.now()}@example.test`;
  const password = "AnAnShop123";

  await page.goto("/register");
  await page.getByLabel("Họ và tên").fill("Nguyễn An Nhiên");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByLabel("Xác nhận mật khẩu").fill(password);
  await page.getByRole("checkbox").check();

  const registerResponse = page.waitForResponse((response) => response.url().endsWith("/api/auth/register") && response.request().method() === "POST");
  await page.getByTestId("auth-submit").click();
  expect((await registerResponse).status()).toBe(201);
  await expect(page).toHaveURL(/\/login\?registered=1$/);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu").fill(password);
  const loginResponse = page.waitForResponse((response) => response.url().endsWith("/api/auth/login") && response.request().method() === "POST");
  await page.getByTestId("auth-submit").click();
  expect((await loginResponse).status()).toBe(200);
  await expect(page).toHaveURL(/\/account$/);
});

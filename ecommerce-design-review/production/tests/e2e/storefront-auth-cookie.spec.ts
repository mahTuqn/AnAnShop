import { expect, test } from "@playwright/test";

test("auth dùng HttpOnly cookie và logout vô hiệu hóa session", async ({ request }, testInfo) => {
  const email = `cookie-${testInfo.project.name}-${Date.now()}@example.test`;
  const password = "AnAnShop123";
  const registered = await request.post("/api/auth/register", { data: { email, password, fullName: "Nguyễn An Nhiên" } });
  expect(registered.status()).toBe(201);
  const setCookie = registered.headers()["set-cookie"] ?? "";
  expect(setCookie).toContain("anan_session=");
  expect(setCookie.toLowerCase()).toContain("httponly");
  expect(setCookie.toLowerCase()).toContain("samesite=lax");

  const session = await request.get("/api/auth/session");
  expect(session.status()).toBe(200);
  expect((await session.json()).data.user.email).toBe(email);

  const logout = await request.post("/api/auth/logout");
  expect(logout.status()).toBe(200);
  expect((await request.get("/api/auth/session")).status()).toBe(401);
});

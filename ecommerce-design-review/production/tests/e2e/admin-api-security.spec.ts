import { expect, test } from "@playwright/test";

const protectedReads = [
  "/api/admin/dashboard", "/api/admin/orders", "/api/admin/products", "/api/admin/inventory",
  "/api/admin/promotions", "/api/admin/returns", "/api/admin/refunds", "/api/admin/staff",
  "/api/admin/roles", "/api/admin/settings", "/api/admin/audit",
];

test.describe("Admin API security boundary", () => {
  for (const endpoint of protectedReads) {
    test(`GET ${endpoint} từ chối request không có session`, async ({ request }) => {
      const response = await request.get(endpoint);
      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body).toMatchObject({ error: { code: "UNAUTHORIZED" } });
      expect(JSON.stringify(body)).not.toContain("passwordHash");
    });
  }

  test("mutation admin dừng ở auth trước validation hoặc database", async ({ request }) => {
    const calls = [
      request.patch("/api/admin/inventory", { data: {} }),
      request.patch("/api/admin/orders/00000000-0000-0000-0000-000000000000", { data: {} }),
      request.patch("/api/admin/returns/00000000-0000-0000-0000-000000000000", { data: {} }),
      request.patch("/api/admin/settings", { data: {} }),
      request.post("/api/admin/products", { data: {} }),
      request.post("/api/admin/promotions", { data: {} }),
      request.post("/api/admin/refunds", { data: {} }),
    ];
    for (const response of await Promise.all(calls)) {
      expect(response.status()).toBe(401);
      await expect(response.json()).resolves.toMatchObject({ error: { code: "UNAUTHORIZED" } });
    }
  });

  test("Bearer không hợp lệ không được hạ cấp thành guest", async ({ request }) => {
    const response = await request.get("/api/admin/dashboard", { headers: { Authorization: "Bearer invalid-session-token" } });
    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "UNAUTHORIZED" } });
  });
});

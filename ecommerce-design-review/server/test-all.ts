import "dotenv/config";

const BASE_URL = "http://localhost:3001/api";

async function runTests() {
  console.log("🚀 Bắt đầu quá trình kiểm thử toàn diện An An Shop...");
  let passed = 0;
  let failed = 0;

  const test = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (e: any) {
      console.error(`❌ FAIL: ${name} - ${e.message}`);
      failed++;
    }
  };

  await test("1. Kiểm tra trạng thái máy chủ (Health Check)", async () => {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status !== "ok") throw new Error("Server not OK");
  });

  await test("2. Kiểm tra API Danh mục Sản phẩm (Catalog)", async () => {
    const res = await fetch(`${BASE_URL}/catalog/products`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data)) throw new Error("Invalid product data format");
    if (data.data.length === 0) throw new Error("No products found in DB");
  });

  let sessionCookie = "";

  await test("3. Kiểm tra API Đăng nhập Admin (Auth)", async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: "admin@ananshop.vn", password: "Admin@2026" })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error("Login failed");
    if (!data.data.user.roles.includes("ADMIN")) throw new Error("User is not Admin");
    
    // Save cookie for next tests
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) sessionCookie = setCookie.split(";")[0];
  });

  await test("4. Kiểm tra API Bảng điều khiển Quản trị (Admin Dashboard)", async () => {
    if (!sessionCookie) throw new Error("No session cookie from login");
    const res = await fetch(`${BASE_URL}/admin/dashboard`, {
      headers: { "Cookie": sessionCookie }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error("Dashboard fetch failed");
  });

  await test("5. Kiểm tra API Danh sách Đa Kho (Warehouses)", async () => {
    if (!sessionCookie) throw new Error("No session cookie from login");
    const res = await fetch(`${BASE_URL}/warehouses`, {
      headers: { "Cookie": sessionCookie }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data)) throw new Error("Warehouses fetch failed");
  });

  console.log("\\n----------------------------------------");
  console.log(`📊 Kết quả: ${passed} PASS, ${failed} FAIL`);
  if (failed > 0) process.exit(1);
}

runTests();

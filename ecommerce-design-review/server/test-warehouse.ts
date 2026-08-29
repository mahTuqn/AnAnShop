import "dotenv/config";
import { pool } from "./lib/db.js";

async function test() {
  console.log("🔍 Đang kiểm tra dữ liệu Đa Kho...");
  
  const res = await pool.query("SELECT * FROM warehouses");
  console.log("\n📦 Danh sách Kho hiện tại:");
  console.table(res.rows.map(w => ({ Mã: w.code, Tên: w.name, Địa_chỉ: w.city })));

  const inv = await pool.query(`
    SELECT w.name as Kho, p.name as San_pham, v.sku as SKU, i.on_hand as Ton_kho
    FROM inventory_items i
    JOIN warehouses w ON i.warehouse_id = w.id
    JOIN product_variants v ON i.variant_id = v.id
    JOIN products p ON v.product_id = p.id
    LIMIT 5;
  `);
  console.log("\n📊 Mẫu Tồn kho theo Đa Kho:");
  console.table(inv.rows);

  process.exit(0);
}

test();

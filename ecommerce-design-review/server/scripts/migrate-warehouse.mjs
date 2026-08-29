import pg from "pg";
import "dotenv/config";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/ananshop",
});

async function migrate() {
  try {
    console.log("Bắt đầu thực thi Giai đoạn 3 - Multi-warehouse Schema...");
    
    // 1. Create Warehouses table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS warehouses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        address TEXT NOT NULL,
        city VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✔️ Đã tạo bảng warehouses");

    // 2. Modify inventory_items to support warehouse_id
    // First check if column exists
    const checkCol = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='inventory_items' AND column_name='warehouse_id';
    `);

    if (checkCol.rows.length === 0) {
      await pool.query(`
        ALTER TABLE inventory_items 
        ADD COLUMN warehouse_id UUID REFERENCES warehouses(id);
      `);
      console.log("✔️ Đã thêm cột warehouse_id vào bảng inventory_items");

      // Insert default warehouse
      const whResult = await pool.query(`
        INSERT INTO warehouses (code, name, address, city) 
        VALUES ('WH-HCM-01', 'Kho Tổng TP.HCM', '18 Võ Văn Tần', 'TP.HCM')
        RETURNING id;
      `);
      const defaultWhId = whResult.rows[0].id;
      
      // Update existing inventory
      await pool.query(`
        UPDATE inventory_items SET warehouse_id = $1 WHERE warehouse_id IS NULL;
      `, [defaultWhId]);

      // Make warehouse_id NOT NULL
      await pool.query(`
        ALTER TABLE inventory_items ALTER COLUMN warehouse_id SET NOT NULL;
      `);
      console.log("✔️ Đã cập nhật dữ liệu tồn kho cũ vào Kho Tổng TP.HCM");
      
      // Update unique constraint
      await pool.query(`
        ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS inventory_items_variant_id_key;
        ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_variant_warehouse_key UNIQUE (variant_id, warehouse_id);
      `);
      console.log("✔️ Đã cập nhật Unique Constraint cho Tồn kho (variant_id + warehouse_id)");
    } else {
      console.log("⏭️ Bảng inventory_items đã hỗ trợ đa kho.");
    }

    // 3. Add warehouse_id to shipments
    const checkShipmentCol = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='shipments' AND column_name='warehouse_id';
    `);

    if (checkShipmentCol.rows.length === 0) {
      await pool.query(`
        ALTER TABLE shipments 
        ADD COLUMN warehouse_id UUID REFERENCES warehouses(id);
      `);
      console.log("✔️ Đã cập nhật bảng shipments hỗ trợ xuất phát từ đa kho");
    }

    // 4. Create new API Route file for Warehouse Management
    console.log("✔️ Cấu trúc Database Đa Kho (Multi-warehouse) đã hoàn tất!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi khi thực thi:", error);
    process.exit(1);
  }
}

migrate();

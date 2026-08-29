import { Router } from "express";
import { pool } from "../lib/db.js";
import { ok, fail } from "../lib/response.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Lấy danh sách tất cả các kho
router.get("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM warehouses ORDER BY created_at ASC");
    ok(res, result.rows);
  } catch (err: any) {
    fail(res, 500, err.message);
  }
});

// Tạo kho mới
router.post("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { code, name, address, city } = req.body;
    const result = await pool.query(
      "INSERT INTO warehouses (code, name, address, city) VALUES ($1, $2, $3, $4) RETURNING *",
      [code, name, address, city]
    );
    ok(res, result.rows[0]);
  } catch (err: any) {
    fail(res, 500, err.message);
  }
});

// Lấy tồn kho theo sản phẩm tại tất cả các kho
router.get("/inventory/:productId", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await pool.query(`
      SELECT 
        w.name as warehouse_name,
        w.code as warehouse_code,
        v.sku,
        i.on_hand as quantity,
        i.reserved as reserved_quantity
      FROM inventory_items i
      JOIN warehouses w ON i.warehouse_id = w.id
      JOIN product_variants v ON i.variant_id = v.id
      WHERE v.product_id = $1
      ORDER BY w.name, v.sku
    `, [productId]);
    ok(res, result.rows);
  } catch (err: any) {
    fail(res, 500, err.message);
  }
});

// Điều chuyển tồn kho giữa 2 kho
router.post("/transfer", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { fromWarehouseId, toWarehouseId, variantId, quantity } = req.body;
    
    await pool.query("BEGIN");
    
    // Check source inventory
    const sourceInv = await pool.query(
      "SELECT on_hand FROM inventory_items WHERE warehouse_id = $1 AND variant_id = $2 FOR UPDATE",
      [fromWarehouseId, variantId]
    );
    
    if (sourceInv.rows.length === 0 || sourceInv.rows[0].on_hand < quantity) {
      throw new Error("Không đủ tồn kho ở kho xuất");
    }

    // Deduct from source
    await pool.query(
      "UPDATE inventory_items SET on_hand = on_hand - $1 WHERE warehouse_id = $2 AND variant_id = $3",
      [quantity, fromWarehouseId, variantId]
    );

    // Add to destination
    const destInv = await pool.query(
      "SELECT id FROM inventory_items WHERE warehouse_id = $1 AND variant_id = $2",
      [toWarehouseId, variantId]
    );
    
    if (destInv.rows.length > 0) {
      await pool.query(
        "UPDATE inventory_items SET on_hand = on_hand + $1 WHERE warehouse_id = $2 AND variant_id = $3",
        [quantity, toWarehouseId, variantId]
      );
    } else {
      await pool.query(
        "INSERT INTO inventory_items (warehouse_id, variant_id, on_hand, reserved, low_stock_level) VALUES ($1, $2, $3, 0, 5)",
        [toWarehouseId, variantId, quantity]
      );
    }

    // Record movement
    await pool.query(
      "INSERT INTO inventory_movements (variant_id, type, quantity, reference_id, notes) VALUES ($1, $2, $3, $4, $5)",
      [variantId, 'transfer', quantity, null, `Chuyển ${quantity} từ kho ${fromWarehouseId} sang ${toWarehouseId}`]
    );

    await pool.query("COMMIT");
    ok(res, { message: "Điều chuyển kho thành công" });
  } catch (err: any) {
    await pool.query("ROLLBACK");
    fail(res, 400, err.message);
  }
});

export default router;

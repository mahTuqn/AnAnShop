import { Router } from "express";
import { query, withTransaction } from "../lib/db.js";
import { ok, fail, notFound } from "../lib/response.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Khách hàng tạo Yêu cầu Đổi trả (RMA)
router.post("/:orderId", requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason, items } = req.body; // items = [{ order_item_id, quantity, reason }]
    const userId = req.user!.userId;

    // Xác minh đơn hàng thuộc về user và đã giao thành công
    const order = await query(
      "SELECT id, status FROM orders WHERE id = $1 AND customer_id = $2",
      [orderId, userId]
    );

    if (order.rows.length === 0) return notFound(res, "Đơn hàng");
    if (order.rows[0].status !== "DELIVERED") {
      return fail(res, 400, "Chỉ có thể yêu cầu đổi trả cho đơn hàng đã giao");
    }

    await withTransaction(async (client) => {
      // 1. Tạo request
      const reqRes = await client.query(
        "INSERT INTO return_requests (order_id, customer_id, reason, status) VALUES ($1, $2, $3, 'PENDING') RETURNING id",
        [orderId, userId, reason]
      );
      const requestId = reqRes.rows[0].id;

      // 2. Thêm items
      for (const item of items) {
        await client.query(
          "INSERT INTO return_items (request_id, order_item_id, quantity, reason) VALUES ($1, $2, $3, $4)",
          [requestId, item.order_item_id, item.quantity, item.reason]
        );
      }
      
      // 3. Cập nhật status đơn hàng (Tuỳ logic business)
      await client.query("UPDATE orders SET status = 'RETURN_REQUESTED' WHERE id = $1", [orderId]);
    });

    ok(res, { message: "Yêu cầu đổi trả đã được tạo thành công" });
  } catch (err: any) {
    fail(res, 500, err.message);
  }
});

// Admin hoặc khách xem chi tiết yêu cầu
router.get("/:requestId", requireAuth, async (req, res) => {
  try {
    const { requestId } = req.params;
    const result = await query(
      "SELECT * FROM return_requests WHERE id = $1",
      [requestId]
    );
    if (result.rows.length === 0) return notFound(res, "Yêu cầu đổi trả");
    
    // Authorization check
    if (result.rows[0].customer_id !== req.user!.userId && !req.user!.roles.includes("ADMIN")) {
      return fail(res, 403, "Không có quyền truy cập");
    }

    const items = await query("SELECT * FROM return_items WHERE request_id = $1", [requestId]);
    
    ok(res, { ...result.rows[0], items: items.rows });
  } catch (err: any) {
    fail(res, 500, err.message);
  }
});

export default router;

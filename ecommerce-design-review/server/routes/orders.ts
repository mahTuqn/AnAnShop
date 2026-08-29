// Orders routes: list, detail, cancel
import { Router, type Request, type Response } from "express";
import { query, withTransaction } from "../lib/db.js";
import { ok, notFound, fail, paginated } from "../lib/response.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { parsePagination } from "../lib/response.js";
import { writeAudit } from "../services/audit.js";

const router = Router();

const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPING", "CANCELLED"],
  SHIPPING: ["DELIVERED"],
  DELIVERED: ["RETURN_REQUESTED"],
  RETURN_REQUESTED: ["RETURNED", "DELIVERED"],
};

// GET /api/orders — Member order history
router.get("/", requireAuth, async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
  const userId = req.user!.userId;

  const [data, count] = await Promise.all([
    query(
      `SELECT o.id, o.code, o.status, o.payment_status, o.grand_total, o.placed_at,
              (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS item_count,
              (SELECT url FROM product_images pi JOIN order_items oi ON oi.variant_id IS NOT NULL
                WHERE oi.order_id = o.id AND pi.product_id = oi.product_id LIMIT 1) AS first_image
       FROM orders o WHERE o.user_id = $1 ORDER BY o.placed_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
    query("SELECT COUNT(*) FROM orders WHERE user_id = $1", [userId]),
  ]);

  paginated(res, data.rows, Number(count.rows[0].count), page, limit);
});

// GET /api/orders/:code
router.get("/:code", optionalAuth, async (req: Request, res: Response) => {
  const { code } = req.params;
  const userId = req.user?.userId ?? null;
  const guestPhone = req.query.phone as string | undefined;

  const orderRes = await query(
    `SELECT o.*, oa.full_name, oa.phone AS recipient_phone, oa.province, oa.district, oa.ward, oa.line1
     FROM orders o
     LEFT JOIN order_addresses oa ON oa.order_id = o.id AND oa.type = 'SHIPPING'
     WHERE o.code = $1`,
    [code]
  );
  if (!orderRes.rowCount) { notFound(res, "Order"); return; }
  const order = orderRes.rows[0];

  // Ownership check
  const isOwner = (userId && order.user_id === userId) || (guestPhone && order.guest_phone === guestPhone);
  if (!isOwner && !req.user?.roles.some(r => ["ADMIN", "STAFF"].includes(r))) {
    fail(res, 403, "Access denied", "FORBIDDEN");
    return;
  }

  const [items, payments, shipments] = await Promise.all([
    query(
      `SELECT oi.*, p.slug AS product_slug FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = $1`,
      [order.id]
    ),
    query("SELECT id, method, status, amount, paid_at FROM payments WHERE order_id = $1", [order.id]),
    query(
      `SELECT s.id, s.carrier, s.tracking_code, s.status, s.estimated_delivery_at,
              json_agg(se ORDER BY se.occurred_at DESC) AS events
       FROM shipments s
       LEFT JOIN shipment_events se ON se.shipment_id = s.id
       WHERE s.order_id = $1 GROUP BY s.id`,
      [order.id]
    ),
  ]);

  ok(res, { ...order, items: items.rows, payments: payments.rows, shipments: shipments.rows });
});

// PATCH /api/orders/:code/cancel — Customer cancel
router.patch("/:code/cancel", requireAuth, async (req: Request, res: Response) => {
  const { code } = req.params;
  const userId = req.user!.userId;

  const orderRes = await query(
    "SELECT id, status, user_id FROM orders WHERE code = $1",
    [code]
  );
  if (!orderRes.rowCount) { notFound(res, "Order"); return; }
  const order = orderRes.rows[0];
  if (order.user_id !== userId) { fail(res, 403, "Access denied", "FORBIDDEN"); return; }

  const allowed = ORDER_STATUS_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes("CANCELLED")) {
    fail(res, 400, `Không thể hủy đơn ở trạng thái ${order.status}`, "INVALID_TRANSITION");
    return;
  }

  await withTransaction(async (client) => {
    const before = { status: order.status };
    await client.query(
      "UPDATE orders SET status = 'CANCELLED', cancelled_at = NOW() WHERE id = $1",
      [order.id]
    );
    // Release reserved stock
    const items = await client.query(
      "SELECT variant_id, quantity FROM order_items WHERE order_id = $1",
      [order.id]
    );
    for (const item of items.rows) {
      await client.query(
        `UPDATE inventory_items SET reserved = GREATEST(0, reserved - $1) WHERE variant_id = $2`,
        [item.quantity, item.variant_id]
      );
      await client.query(
        `INSERT INTO inventory_movements (inventory_item_id, type, quantity, reference_type, reference_id, created_by)
         SELECT id, 'RELEASE', $1, 'orders', $2, $3 FROM inventory_items WHERE variant_id = $4`,
        [item.quantity, order.id, userId, item.variant_id]
      );
    }
    await writeAudit(
      { actorUserId: userId, action: "order.cancel", entityType: "orders", entityId: order.id, beforeData: before, afterData: { status: "CANCELLED" } },
      client
    );
  });

  ok(res, { message: "Đã hủy đơn hàng" });
});

// POST /api/returns — Yêu cầu đổi trả
router.post("/returns", requireAuth, async (req: Request, res: Response) => {
  const { orderCode, reason, items, customerNote } = req.body as {
    orderCode: string;
    reason: string;
    items: { orderItemId: string; quantity: number }[];
    customerNote?: string;
  };

  const orderRes = await query("SELECT id, user_id, status FROM orders WHERE code = $1", [orderCode]);
  if (!orderRes.rowCount) { notFound(res, "Order"); return; }
  const order = orderRes.rows[0];
  if (order.user_id !== req.user!.userId) { fail(res, 403, "Access denied", "FORBIDDEN"); return; }
  if (order.status !== "DELIVERED") { fail(res, 400, "Chỉ có thể yêu cầu đổi trả khi đơn đã giao", "INVALID_STATUS"); return; }

  const returnId = await withTransaction(async (client) => {
    const result = await client.query(
      `INSERT INTO return_requests (order_id, user_id, reason, customer_note)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [order.id, req.user!.userId, reason, customerNote ?? null]
    );
    const id = result.rows[0].id;

    for (const item of items) {
      await client.query(
        `INSERT INTO return_items (return_request_id, order_item_id, quantity)
         VALUES ($1,$2,$3)`,
        [id, item.orderItemId, item.quantity]
      );
    }

    await client.query(`UPDATE orders SET status = 'RETURN_REQUESTED' WHERE id = $1`, [order.id]);
    await writeAudit({ actorUserId: req.user!.userId, action: "return.request", entityType: "return_requests", entityId: id }, client);
    return id;
  });

  ok(res, { returnId }, 201);
});

export default router;

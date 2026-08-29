// Checkout quote + Order placement
// All pricing is server-authoritative — client price is never trusted
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { query, withTransaction } from "../lib/db.js";
import { ok, badRequest, fail } from "../lib/response.js";
import { optionalAuth } from "../middleware/auth.js";
import { writeAudit } from "../services/audit.js";

const router = Router();

const AddressSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().regex(/^(0|\+84)\d{9}$/),
  email: z.string().email().optional(),
  province: z.string().min(1),
  district: z.string().min(1),
  ward: z.string().min(1),
  line1: z.string().min(5),
});

const QuoteSchema = z.object({
  items: z.array(z.object({ variantId: z.string().uuid(), quantity: z.number().int().min(1) })),
  couponCode: z.string().optional(),
  shippingMethod: z.enum(["standard", "express"]).default("standard"),
});

// POST /api/checkout/quote — Server-side price calculation
router.post("/quote", optionalAuth, async (req: Request, res: Response) => {
  const parsed = QuoteSchema.safeParse(req.body);
  if (!parsed.success) { badRequest(res, parsed.error.errors[0].message); return; }
  const { items, couponCode, shippingMethod } = parsed.data;

  // Fetch variant prices and stock
  const variantIds = items.map(i => i.variantId);
  const variantResult = await query(
    `SELECT pv.id, pv.price, (ii.on_hand - ii.reserved) AS available
     FROM product_variants pv
     LEFT JOIN inventory_items ii ON ii.variant_id = pv.id
     WHERE pv.id = ANY($1) AND pv.active = TRUE`,
    [variantIds]
  );

  const variantMap = new Map(variantResult.rows.map(v => [v.id, v]));
  let subtotal = 0;

  for (const item of items) {
    const v = variantMap.get(item.variantId);
    if (!v) { badRequest(res, `Sản phẩm không tồn tại: ${item.variantId}`); return; }
    if (v.available < item.quantity) { fail(res, 400, "Sản phẩm hết hàng", "OUT_OF_STOCK"); return; }
    subtotal += Number(v.price) * item.quantity;
  }

  const shippingFee = shippingMethod === "express" ? 45000 : subtotal >= 699000 ? 0 : 30000;
  let discountTotal = 0;
  let couponId: string | null = null;
  let couponError: string | null = null;

  if (couponCode) {
    const couponResult = await query(
      `SELECT id, type, scope, value, minimum_order, maximum_discount, usage_limit,
              (SELECT COUNT(*) FROM coupon_redemptions WHERE coupon_id = coupons.id) AS used_count
       FROM coupons
       WHERE UPPER(code) = UPPER($1) AND active = TRUE AND starts_at <= NOW() AND ends_at >= NOW()`,
      [couponCode]
    );
    if (!couponResult.rowCount) {
      couponError = "Mã giảm giá không hợp lệ hoặc đã hết hạn";
    } else {
      const c = couponResult.rows[0];
      if (c.minimum_order > subtotal) {
        couponError = `Đơn hàng tối thiểu ${c.minimum_order.toLocaleString("vi-VN")}₫`;
      } else if (c.usage_limit && c.used_count >= c.usage_limit) {
        couponError = "Mã giảm giá đã hết lượt sử dụng";
      } else {
        couponId = c.id;
        if (c.type === "PERCENTAGE") {
          discountTotal = Math.round(subtotal * c.value / 100);
          if (c.maximum_discount) discountTotal = Math.min(discountTotal, c.maximum_discount);
        } else if (c.type === "FIXED_AMOUNT") {
          discountTotal = Math.min(c.value, subtotal);
        } else if (c.type === "FREE_SHIPPING") {
          discountTotal = shippingFee;
        }
      }
    }
  }

  const grandTotal = subtotal + shippingFee - discountTotal;
  ok(res, {
    subtotal,
    shippingFee,
    discountTotal,
    grandTotal,
    couponId,
    couponCode: couponCode ?? null,
    couponError,
    items: items.map(i => ({
      variantId: i.variantId,
      quantity: i.quantity,
      unitPrice: Number(variantMap.get(i.variantId)!.price),
    })),
  });
});

const PlaceOrderSchema = z.object({
  items: z.array(z.object({ variantId: z.string().uuid(), quantity: z.number().int().min(1), unitPrice: z.number() })),
  shippingAddress: AddressSchema,
  shippingMethod: z.enum(["standard", "express"]).default("standard"),
  paymentMethod: z.enum(["COD", "MOMO", "VNPAY", "CARD"]),
  couponCode: z.string().optional(),
  couponId: z.string().uuid().optional(),
  idempotencyKey: z.string().optional(),
  customerNote: z.string().max(500).optional(),
});

// POST /api/orders — Place order (atomic: reserve stock + create order + coupon redemption)
router.post("/", optionalAuth, async (req: Request, res: Response) => {
  const parsed = PlaceOrderSchema.safeParse(req.body);
  if (!parsed.success) { badRequest(res, parsed.error.errors[0].message); return; }
  const { items, shippingAddress, shippingMethod, paymentMethod, couponCode, couponId, customerNote } = parsed.data;
  const idempotencyKey = parsed.data.idempotencyKey ?? uuid();
  const userId = req.user?.userId ?? null;

  // Check idempotency
  const existingOrder = await query("SELECT code FROM orders WHERE idempotency_key = $1", [idempotencyKey]);
  if (existingOrder.rowCount) {
    ok(res, { orderCode: existingOrder.rows[0].code, existing: true });
    return;
  }

  let orderCode: string;

  await withTransaction(async (client) => {
    // 1. Lock inventory rows and verify stock
    const variantIds = items.map(i => i.variantId);
    const lockResult = await client.query(
      `SELECT pv.id, pv.price, ii.id AS inventory_id, ii.on_hand, ii.reserved
       FROM product_variants pv
       JOIN inventory_items ii ON ii.variant_id = pv.id
       WHERE pv.id = ANY($1) AND pv.active = TRUE
       FOR UPDATE`,
      [variantIds]
    );

    const variantMap = new Map(lockResult.rows.map(v => [v.id, v]));

    let subtotal = 0;
    for (const item of items) {
      const v = variantMap.get(item.variantId);
      if (!v) throw new Error(`Variant ${item.variantId} not found`);
      const available = v.on_hand - v.reserved;
      if (available < item.quantity) throw new Error("INSUFFICIENT_STOCK");
      subtotal += Number(v.price) * item.quantity;
    }

    const shippingFee = shippingMethod === "express" ? 45000 : subtotal >= 699000 ? 0 : 30000;
    let discountTotal = 0;

    // 2. Validate coupon again server-side
    if (couponId) {
      const couponRes = await client.query(
        `SELECT id, type, value, minimum_order, maximum_discount, usage_limit,
                (SELECT COUNT(*) FROM coupon_redemptions WHERE coupon_id = $1) AS used_count
         FROM coupons WHERE id = $1 AND active = TRUE AND starts_at <= NOW() AND ends_at >= NOW()
         FOR UPDATE`,
        [couponId]
      );
      if (!couponRes.rowCount) throw new Error("COUPON_INVALID");
      const c = couponRes.rows[0];
      if (c.minimum_order > subtotal) throw new Error("COUPON_MIN_ORDER");
      if (c.usage_limit && c.used_count >= c.usage_limit) throw new Error("COUPON_EXHAUSTED");

      if (c.type === "PERCENTAGE") {
        discountTotal = Math.round(subtotal * c.value / 100);
        if (c.maximum_discount) discountTotal = Math.min(discountTotal, c.maximum_discount);
      } else if (c.type === "FIXED_AMOUNT") {
        discountTotal = Math.min(c.value, subtotal);
      } else if (c.type === "FREE_SHIPPING") {
        discountTotal = shippingFee;
      }
    }

    const grandTotal = subtotal + shippingFee - discountTotal;

    // 3. Create order
    orderCode = `AN${Date.now().toString().slice(-8)}`;
    const orderId = uuid();
    await client.query(
      `INSERT INTO orders
        (id, code, user_id, guest_phone, status, payment_status, subtotal, shipping_fee, discount_total, grand_total,
         customer_note, idempotency_key)
       VALUES ($1,$2,$3,$4,'PENDING','PENDING',$5,$6,$7,$8,$9,$10)`,
      [orderId, orderCode, userId, userId ? null : shippingAddress.phone,
        subtotal, shippingFee, discountTotal, grandTotal, customerNote ?? null, idempotencyKey]
    );

    // 4. Shipping address snapshot
    await client.query(
      `INSERT INTO order_addresses (order_id, type, full_name, phone, email, province, district, ward, line1)
       VALUES ($1,'SHIPPING',$2,$3,$4,$5,$6,$7,$8)`,
      [orderId, shippingAddress.fullName, shippingAddress.phone, shippingAddress.email ?? null,
        shippingAddress.province, shippingAddress.district, shippingAddress.ward, shippingAddress.line1]
    );

    // 5. Order items snapshot + reserve inventory
    for (const item of items) {
      const v = variantMap.get(item.variantId)!;
      const lineTotal = Number(v.price) * item.quantity;

      // Get product info for snapshot
      const productInfo = await client.query(
        `SELECT p.name, pv.sku, (SELECT url FROM product_images WHERE product_id = p.id ORDER BY position LIMIT 1) AS image_url
         FROM product_variants pv JOIN products p ON p.id = pv.product_id WHERE pv.id = $1`,
        [item.variantId]
      );
      const pi = productInfo.rows[0];

      await client.query(
        `INSERT INTO order_items (order_id, variant_id, product_name, sku, image_url, quantity, unit_price, line_total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [orderId, item.variantId, pi.product_name, pi.sku, pi.image_url, item.quantity, v.price, lineTotal]
      );

      // Reserve inventory
      await client.query(
        `UPDATE inventory_items SET reserved = reserved + $1 WHERE id = $2`,
        [item.quantity, v.inventory_id]
      );
      await client.query(
        `INSERT INTO inventory_movements (inventory_item_id, type, quantity, reference_type, reference_id)
         VALUES ($1,'RESERVE',$2,'orders',$3)`,
        [v.inventory_id, item.quantity, orderId]
      );
    }

    // 6. Coupon redemption
    if (couponId) {
      await client.query(
        `INSERT INTO coupon_redemptions (coupon_id, order_id, user_id) VALUES ($1,$2,$3)`,
        [couponId, orderId, userId]
      );
      await client.query(
        `INSERT INTO order_coupons (order_id, coupon_id, code, discount_amount) VALUES ($1,$2,$3,$4)`,
        [orderId, couponId, couponCode ?? "", discountTotal]
      );
    }

    // 7. Convert cart to CONVERTED
    if (userId) {
      await client.query(
        `UPDATE carts SET status = 'CONVERTED' WHERE user_id = $1 AND status = 'ACTIVE'`,
        [userId]
      );
    }

    // 8. Audit
    await writeAudit(
      { actorUserId: userId, action: "order.placed", entityType: "orders", entityId: orderId, afterData: { orderCode, grandTotal } },
      client
    );
  });

  ok(res, { orderCode: orderCode! }, 201);
});

// GET /api/orders — Order history (member)
// GET /api/orders/:code — Order detail

export { router as checkoutRouter };
export default router;

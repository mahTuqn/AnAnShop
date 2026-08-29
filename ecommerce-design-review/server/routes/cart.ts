// Cart routes: GET, POST (add item), PATCH (update item), DELETE (remove item)
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { query, withTransaction } from "../lib/db.js";
import { ok, badRequest, notFound, fail } from "../lib/response.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

const router = Router();

// Helper: get or create active cart for user/session
async function getOrCreateCart(userId: string | null, sessionId: string | null): Promise<string> {
  const existing = await query(
    `SELECT id FROM carts WHERE (($1::uuid IS NOT NULL AND user_id = $1) OR ($2 IS NOT NULL AND session_id = $2)) AND status = 'ACTIVE' LIMIT 1`,
    [userId, sessionId]
  );
  if (existing.rowCount) return existing.rows[0].id;

  const created = await query(
    `INSERT INTO carts (user_id, session_id) VALUES ($1, $2) RETURNING id`,
    [userId, sessionId]
  );
  return created.rows[0].id;
}

// GET /api/cart
router.get("/", optionalAuth, async (req: Request, res: Response) => {
  const userId = req.user?.userId ?? null;
  const sessionId = (req.headers["x-session-id"] as string | undefined) ?? null;
  if (!userId && !sessionId) { ok(res, { items: [], subtotal: 0 }); return; }

  const cartRes = await query(
    `SELECT c.id FROM carts c WHERE (($1::uuid IS NOT NULL AND c.user_id = $1) OR ($2 IS NOT NULL AND c.session_id = $2)) AND c.status = 'ACTIVE' LIMIT 1`,
    [userId, sessionId]
  );
  if (!cartRes.rowCount) { ok(res, { items: [], subtotal: 0 }); return; }
  const cartId = cartRes.rows[0].id;

  const items = await query(
    `SELECT ci.id, ci.variant_id, ci.quantity, ci.unit_price,
            pv.sku, pv.price AS current_price, pv.active,
            p.id AS product_id, p.name AS product_name, p.slug,
            (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.position LIMIT 1) AS image_url,
            (ii.on_hand - ii.reserved) AS available
     FROM cart_items ci
     JOIN product_variants pv ON pv.id = ci.variant_id
     JOIN products p ON p.id = pv.product_id
     LEFT JOIN inventory_items ii ON ii.variant_id = ci.variant_id
     WHERE ci.cart_id = $1`,
    [cartId]
  );

  const subtotal = items.rows.reduce((s: number, i: { unit_price: string; quantity: number }) => s + Number(i.unit_price) * i.quantity, 0);
  ok(res, { cartId, items: items.rows, subtotal });
});

// POST /api/cart — Add item
const AddItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
});

router.post("/", optionalAuth, async (req: Request, res: Response) => {
  const parsed = AddItemSchema.safeParse(req.body);
  if (!parsed.success) { badRequest(res, parsed.error.errors[0].message); return; }
  const { variantId, quantity } = parsed.data;

  const userId = req.user?.userId ?? null;
  const sessionId = (req.headers["x-session-id"] as string | undefined) ?? null;
  if (!userId && !sessionId) { badRequest(res, "Session ID required for guest cart"); return; }

  // Check variant + stock
  const variantRes = await query(
    `SELECT pv.id, pv.price, pv.active, (ii.on_hand - ii.reserved) AS available
     FROM product_variants pv
     LEFT JOIN inventory_items ii ON ii.variant_id = pv.id
     WHERE pv.id = $1`,
    [variantId]
  );
  if (!variantRes.rowCount) { notFound(res, "Variant"); return; }
  const variant = variantRes.rows[0];
  if (!variant.active) { fail(res, 400, "Sản phẩm này không còn bán", "VARIANT_INACTIVE"); return; }
  if (variant.available < quantity) { fail(res, 400, "Không đủ hàng", "OUT_OF_STOCK"); return; }

  const cartId = await getOrCreateCart(userId, sessionId);

  // Upsert cart item
  await query(
    `INSERT INTO cart_items (cart_id, variant_id, quantity, unit_price)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (cart_id, variant_id) DO UPDATE
       SET quantity = cart_items.quantity + EXCLUDED.quantity,
           unit_price = EXCLUDED.unit_price,
           updated_at = NOW()`,
    [cartId, variantId, quantity, variant.price]
  );

  ok(res, { message: "Đã thêm vào giỏ hàng" }, 201);
});

// PATCH /api/cart/:itemId — Update quantity
router.patch("/:itemId", optionalAuth, async (req: Request, res: Response) => {
  const { itemId } = req.params;
  const { quantity } = req.body as { quantity: number };
  if (typeof quantity !== "number" || quantity < 0) { badRequest(res, "Invalid quantity"); return; }

  if (quantity === 0) {
    await query("DELETE FROM cart_items WHERE id = $1", [itemId]);
  } else {
    await query("UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2", [quantity, itemId]);
  }
  ok(res, { message: "Đã cập nhật giỏ hàng" });
});

// DELETE /api/cart/:itemId — Remove item
router.delete("/:itemId", optionalAuth, async (req: Request, res: Response) => {
  await query("DELETE FROM cart_items WHERE id = $1", [req.params.itemId]);
  ok(res, { message: "Đã xóa sản phẩm khỏi giỏ hàng" });
});

// POST /api/cart/merge — Merge guest cart into member cart on login
router.post("/merge", requireAuth, async (req: Request, res: Response) => {
  const { guestSessionId } = req.body as { guestSessionId?: string };
  if (!guestSessionId) { badRequest(res, "guestSessionId required"); return; }

  await withTransaction(async (client) => {
    const guestCart = await client.query(
      `SELECT id FROM carts WHERE session_id = $1 AND status = 'ACTIVE' LIMIT 1`,
      [guestSessionId]
    );
    if (!guestCart.rowCount) return;
    const guestCartId = guestCart.rows[0].id;

    const memberCart = await getOrCreateCart(req.user!.userId, null);

    // Copy guest items to member cart (skip if already has same variant)
    await client.query(
      `INSERT INTO cart_items (cart_id, variant_id, quantity, unit_price)
       SELECT $1, variant_id, quantity, unit_price FROM cart_items WHERE cart_id = $2
       ON CONFLICT (cart_id, variant_id) DO NOTHING`,
      [memberCart, guestCartId]
    );
    await client.query(`UPDATE carts SET status = 'CONVERTED' WHERE id = $1`, [guestCartId]);
  });

  ok(res, { message: "Đã đồng bộ giỏ hàng" });
});

export default router;

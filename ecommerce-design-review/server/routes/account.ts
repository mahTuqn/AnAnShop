// Account routes: profile, addresses, wishlist, reviews
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { query, withTransaction } from "../lib/db.js";
import { ok, badRequest, notFound } from "../lib/response.js";
import { requireAuth } from "../middleware/auth.js";
import { writeAudit } from "../services/audit.js";

const router = Router();

// ── Profile ──────────────────────────────────────────────────────────────────
router.get("/", requireAuth, async (req: Request, res: Response) => {
  const result = await query(
    "SELECT id, email, phone, full_name, avatar_url, status, created_at FROM users WHERE id = $1",
    [req.user!.userId]
  );
  ok(res, result.rows[0]);
});

const UpdateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().regex(/^(0|\+84)\d{9}$/).optional(),
});

router.patch("/", requireAuth, async (req: Request, res: Response) => {
  const parsed = UpdateProfileSchema.safeParse(req.body);
  if (!parsed.success) { badRequest(res, parsed.error.errors[0].message); return; }

  const fields: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (parsed.data.fullName) { fields.push(`full_name = $${idx++}`); params.push(parsed.data.fullName); }
  if (parsed.data.phone) { fields.push(`phone = $${idx++}`); params.push(parsed.data.phone); }
  if (!fields.length) { badRequest(res, "No fields to update"); return; }
  params.push(req.user!.userId);

  await withTransaction(async (client) => {
    await client.query(`UPDATE users SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${idx}`, params);
    await writeAudit({ actorUserId: req.user!.userId, action: "user.update_profile", entityType: "users", entityId: req.user!.userId }, client);
  });

  ok(res, { message: "Đã cập nhật thông tin" });
});

// ── Addresses ─────────────────────────────────────────────────────────────────
router.get("/addresses", requireAuth, async (req: Request, res: Response) => {
  const result = await query(
    "SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at ASC",
    [req.user!.userId]
  );
  ok(res, result.rows);
});

const AddressSchema = z.object({
  label: z.string().optional(),
  fullName: z.string().min(2),
  phone: z.string().regex(/^(0|\+84)\d{9}$/),
  province: z.string().min(1),
  district: z.string().min(1),
  ward: z.string().min(1),
  line1: z.string().min(5),
  isDefault: z.boolean().optional(),
});

router.post("/addresses", requireAuth, async (req: Request, res: Response) => {
  const parsed = AddressSchema.safeParse(req.body);
  if (!parsed.success) { badRequest(res, parsed.error.errors[0].message); return; }
  const d = parsed.data;

  await withTransaction(async (client) => {
    if (d.isDefault) {
      await client.query("UPDATE addresses SET is_default = FALSE WHERE user_id = $1", [req.user!.userId]);
    }
    await client.query(
      `INSERT INTO addresses (user_id, label, full_name, phone, province, district, ward, line1, is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [req.user!.userId, d.label ?? null, d.fullName, d.phone, d.province, d.district, d.ward, d.line1, d.isDefault ?? false]
    );
  });

  ok(res, { message: "Đã thêm địa chỉ" }, 201);
});

router.patch("/addresses/:id", requireAuth, async (req: Request, res: Response) => {
  const parsed = AddressSchema.partial().safeParse(req.body);
  if (!parsed.success) { badRequest(res, parsed.error.errors[0].message); return; }
  const d = parsed.data;

  await withTransaction(async (client) => {
    if (d.isDefault) {
      await client.query("UPDATE addresses SET is_default = FALSE WHERE user_id = $1", [req.user!.userId]);
    }
    const fields: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    const map: Record<string, string> = { label: "label", fullName: "full_name", phone: "phone", province: "province", district: "district", ward: "ward", line1: "line1", isDefault: "is_default" };
    for (const [k, col] of Object.entries(map)) {
      if (d[k as keyof typeof d] !== undefined) {
        fields.push(`${col} = $${idx++}`);
        params.push(d[k as keyof typeof d]);
      }
    }
    if (!fields.length) return;
    params.push(req.params.id, req.user!.userId);
    await client.query(`UPDATE addresses SET ${fields.join(", ")} WHERE id = $${idx++} AND user_id = $${idx}`, params);
  });

  ok(res, { message: "Đã cập nhật địa chỉ" });
});

router.delete("/addresses/:id", requireAuth, async (req: Request, res: Response) => {
  await query("DELETE FROM addresses WHERE id = $1 AND user_id = $2", [req.params.id, req.user!.userId]);
  ok(res, { message: "Đã xóa địa chỉ" });
});

// ── Wishlist ──────────────────────────────────────────────────────────────────
router.get("/wishlist", requireAuth, async (req: Request, res: Response) => {
  const result = await query(
    `SELECT p.id, p.name, p.slug, MIN(pv.price) AS price,
            (SELECT url FROM product_images WHERE product_id = p.id ORDER BY position LIMIT 1) AS image_url,
            wi.created_at AS saved_at
     FROM wishlist_items wi
     JOIN wishlists w ON w.id = wi.wishlist_id
     JOIN products p ON p.id = wi.product_id
     LEFT JOIN product_variants pv ON pv.product_id = p.id AND pv.active = TRUE
     WHERE w.user_id = $1
     GROUP BY p.id, p.name, p.slug, wi.created_at
     ORDER BY wi.created_at DESC`,
    [req.user!.userId]
  );
  ok(res, result.rows);
});

router.post("/wishlist/:productId", requireAuth, async (req: Request, res: Response) => {
  const { productId } = req.params;
  await withTransaction(async (client) => {
    const w = await client.query(
      `INSERT INTO wishlists (user_id) VALUES ($1) ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW() RETURNING id`,
      [req.user!.userId]
    );
    await client.query(
      `INSERT INTO wishlist_items (wishlist_id, product_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [w.rows[0].id, productId]
    );
  });
  ok(res, { message: "Đã thêm vào yêu thích" }, 201);
});

router.delete("/wishlist/:productId", requireAuth, async (req: Request, res: Response) => {
  await query(
    `DELETE FROM wishlist_items WHERE product_id = $1 AND wishlist_id = (SELECT id FROM wishlists WHERE user_id = $2)`,
    [req.params.productId, req.user!.userId]
  );
  ok(res, { message: "Đã xóa khỏi yêu thích" });
});

// ── Reviews ───────────────────────────────────────────────────────────────────
const ReviewSchema = z.object({
  productId: z.string().uuid(),
  orderItemId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(150).optional(),
  content: z.string().max(2000).optional(),
});

router.post("/reviews", requireAuth, async (req: Request, res: Response) => {
  const parsed = ReviewSchema.safeParse(req.body);
  if (!parsed.success) { badRequest(res, parsed.error.errors[0].message); return; }
  const { productId, orderItemId, rating, title, content } = parsed.data;

  // Verify purchase
  let verifiedPurchase = false;
  if (orderItemId) {
    const check = await query(
      `SELECT oi.id FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.id = $1 AND o.user_id = $2 AND oi.product_id = $3 AND o.status = 'DELIVERED'`,
      [orderItemId, req.user!.userId, productId]
    );
    verifiedPurchase = (check.rowCount ?? 0) > 0;
  }

  await query(
    `INSERT INTO reviews (user_id, product_id, order_item_id, rating, title, content, verified_purchase)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (user_id, product_id, order_item_id) DO UPDATE
       SET rating=$4, title=$5, content=$6, updated_at=NOW()`,
    [req.user!.userId, productId, orderItemId ?? null, rating, title ?? null, content ?? null, verifiedPurchase]
  );

  ok(res, { message: "Đã gửi đánh giá, đang chờ duyệt" }, 201);
});

export default router;

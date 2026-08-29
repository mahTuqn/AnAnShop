// @ts-nocheck
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { query, withTransaction } from "../lib/db.js";
import { ok, paginated, notFound, badRequest, fail } from "../lib/response.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { parsePagination } from "../lib/response.js";
import { writeAudit } from "../services/audit.js";

const router = Router();
router.use(requireAuth);

/** Safely cast a query param that may be string | string[] to string | undefined */
const qs = (v: unknown): string | undefined => (Array.isArray(v) ? v[0] : v) as string | undefined;


// ── Dashboard ────────────────────────────────────────────────────────────────
router.get("/dashboard", requirePermission("orders.read"), async (_req: Request, res: Response) => {
  const [revenue, orders, customers, lowStock] = await Promise.all([
    query(`SELECT COALESCE(SUM(grand_total),0) AS total, COUNT(*) AS count FROM orders WHERE status NOT IN ('CANCELLED') AND placed_at > NOW() - INTERVAL '7 days'`),
    query(`SELECT status, COUNT(*) AS count FROM orders WHERE placed_at > NOW() - INTERVAL '30 days' GROUP BY status`),
    query(`SELECT COUNT(*) AS count FROM users WHERE created_at > NOW() - INTERVAL '7 days' AND deleted_at IS NULL`),
    query(`SELECT p.name, pv.sku, ii.on_hand - ii.reserved AS available FROM inventory_items ii JOIN product_variants pv ON pv.id = ii.variant_id JOIN products p ON p.id = pv.product_id WHERE (ii.on_hand - ii.reserved) <= ii.low_stock_level AND p.status = 'ACTIVE' LIMIT 10`),
  ]);
  ok(res, { revenue: revenue.rows[0], ordersByStatus: orders.rows, newCustomers: customers.rows[0].count, lowStock: lowStock.rows });
});

// ── Orders ───────────────────────────────────────────────────────────────────
router.get("/orders", requirePermission("orders.read"), async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
  const status = qs(req.query.status);
  const q = qs(req.query.q);
  let where = "1=1"; const params: unknown[] = []; let idx = 1;
  if (status) { where += ` AND o.status = $${idx++}`; params.push(status); }
  if (q) { where += ` AND (o.code ILIKE $${idx} OR oa.phone ILIKE $${idx} OR oa.full_name ILIKE $${idx})`; params.push(`%${q}%`); idx++; }
  const data = await query(`SELECT o.id, o.code, o.status, o.payment_status, o.grand_total, o.placed_at, oa.full_name, oa.phone FROM orders o LEFT JOIN order_addresses oa ON oa.order_id = o.id AND oa.type = 'SHIPPING' WHERE ${where} ORDER BY o.placed_at DESC LIMIT $${idx++} OFFSET $${idx++}`, [...params, limit, offset]);
  const cnt = await query(`SELECT COUNT(DISTINCT o.id) FROM orders o LEFT JOIN order_addresses oa ON oa.order_id=o.id AND oa.type='SHIPPING' WHERE ${where}`, params);
  paginated(res, data.rows, Number(cnt.rows[0].count), page, limit);
});

const ORDER_TRANSITIONS: Record<string, string[]> = { PENDING: ["CONFIRMED","CANCELLED"], CONFIRMED: ["PROCESSING","CANCELLED"], PROCESSING: ["SHIPPING"], SHIPPING: ["DELIVERED"], DELIVERED: ["RETURN_REQUESTED"], RETURN_REQUESTED: ["RETURNED","DELIVERED"] };

router.patch("/orders/:id", requirePermission("orders.write"), async (req: Request, res: Response) => {
  const { id } = req.params; const { status, adminNote } = req.body as { status?: string; adminNote?: string };
  const orderRes = await query("SELECT id, status FROM orders WHERE id = $1", [id]);
  if (!orderRes.rowCount) { notFound(res, "Order"); return; }
  const order = orderRes.rows[0];
  if (status) {
    const allowed = ORDER_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(status)) { fail(res, 400, `Invalid transition ${order.status} → ${status}`, "INVALID_TRANSITION"); return; }
  }
  await withTransaction(async (client) => {
    const before = { status: order.status };
    const sets: string[] = []; const vals: unknown[] = []; let i = 1;
    if (status) { sets.push(`status = $${i++}`); vals.push(status); if (status === "CANCELLED") { sets.push(`cancelled_at = NOW()`); } if (status === "CONFIRMED") { sets.push(`confirmed_at = NOW()`); } }
    if (adminNote !== undefined) { sets.push(`admin_note = $${i++}`); vals.push(adminNote); }
    if (sets.length) { vals.push(id); await client.query(`UPDATE orders SET ${sets.join(",")} WHERE id = $${i}`, vals); }
    await writeAudit({ actorUserId: req.user!.userId, action: "order.status_change", entityType: "orders", entityId: id, beforeData: before, afterData: { status } }, client);
  });
  ok(res, { message: "Đã cập nhật đơn hàng" });
});

// ── Products ─────────────────────────────────────────────────────────────────
router.get("/products", requirePermission("products.read"), async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
  const q2 = qs(req.query.q);
  const status2 = qs(req.query.status);
  let where = "p.deleted_at IS NULL"; const params: unknown[] = []; let idx = 1;
  if (status2) { where += ` AND p.status = $${idx++}`; params.push(status2); }
  if (q2) { where += ` AND p.name ILIKE $${idx++}`; params.push(`%${q2}%`); }
  const data = await query(`SELECT p.id, p.name, p.slug, p.status, p.featured, cat.name AS category, MIN(pv.price) AS min_price, COUNT(DISTINCT pv.id) AS variant_count FROM products p JOIN categories cat ON cat.id=p.category_id LEFT JOIN product_variants pv ON pv.product_id=p.id WHERE ${where} GROUP BY p.id, cat.name ORDER BY p.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`, [...params, limit, offset]);
  const cnt = await query(`SELECT COUNT(*) FROM products p WHERE ${where}`, params);
  paginated(res, data.rows, Number(cnt.rows[0].count), page, limit);
});

const ProductSchema = z.object({ name: z.string().min(1), slug: z.string().min(1), categoryId: z.string().uuid(), description: z.string().optional(), shortDescription: z.string().optional(), material: z.string().optional(), careInstructions: z.string().optional(), status: z.enum(["DRAFT","ACTIVE","ARCHIVED"]).optional(), featured: z.boolean().optional() });

router.post("/products", requirePermission("products.write"), async (req: Request, res: Response) => {
  const parsed = ProductSchema.safeParse(req.body);
  if (!parsed.success) { badRequest(res, parsed.error.errors[0].message); return; }
  const d = parsed.data;
  const id = uuid();
  await withTransaction(async (client) => {
    await client.query(`INSERT INTO products (id, name, slug, category_id, description, short_description, material, care_instructions, status, featured) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, d.name, d.slug, d.categoryId, d.description??null, d.shortDescription??null, d.material??null, d.careInstructions??null, d.status??'DRAFT', d.featured??false]);
    await writeAudit({ actorUserId: req.user!.userId, action: "product.create", entityType: "products", entityId: id, afterData: d }, client);
  });
  ok(res, { id }, 201);
});

router.patch("/products/:id", requirePermission("products.write"), async (req: Request, res: Response) => {
  const { id } = req.params;
  const before = await query("SELECT * FROM products WHERE id = $1", [id]);
  if (!before.rowCount) { notFound(res, "Product"); return; }
  const parsed = ProductSchema.partial().safeParse(req.body);
  if (!parsed.success) { badRequest(res, parsed.error.errors[0].message); return; }
  const d = parsed.data;
  const sets: string[] = []; const vals: unknown[] = []; let i = 1;
  const colMap: Record<string, string> = { name:"name", slug:"slug", categoryId:"category_id", description:"description", shortDescription:"short_description", material:"material", careInstructions:"care_instructions", status:"status", featured:"featured" };
  for (const [k, col] of Object.entries(colMap)) { if (d[k as keyof typeof d] !== undefined) { sets.push(`${col}=$${i++}`); vals.push(d[k as keyof typeof d]); } }
  if (!sets.length) { badRequest(res, "No fields to update"); return; }
  vals.push(id);
  await withTransaction(async (client) => {
    await client.query(`UPDATE products SET ${sets.join(",")} WHERE id = $${i}`, vals);
    await writeAudit({ actorUserId: req.user!.userId, action: "product.update", entityType: "products", entityId: id, beforeData: before.rows[0], afterData: d }, client);
  });
  ok(res, { message: "Đã cập nhật sản phẩm" });
});

// ── Inventory ────────────────────────────────────────────────────────────────
router.get("/inventory", requirePermission("inventory.read"), async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
  const q3 = qs(req.query.q);
  let where = "p.status = 'ACTIVE'"; const params: unknown[] = []; let idx = 1;
  if (q3) { where += ` AND (p.name ILIKE $${idx} OR pv.sku ILIKE $${idx})`; params.push(`%${q3}%`); idx++; }
  const data = await query(`SELECT ii.id, p.name, pv.sku, ii.on_hand, ii.reserved, (ii.on_hand-ii.reserved) AS available, ii.low_stock_level FROM inventory_items ii JOIN product_variants pv ON pv.id=ii.variant_id JOIN products p ON p.id=pv.product_id WHERE ${where} ORDER BY available ASC LIMIT $${idx++} OFFSET $${idx++}`, [...params, limit, offset]);
  const cnt = await query(`SELECT COUNT(*) FROM inventory_items ii JOIN product_variants pv ON pv.id=ii.variant_id JOIN products p ON p.id=pv.product_id WHERE ${where}`, params);
  paginated(res, data.rows, Number(cnt.rows[0].count), page, limit);
});

const AdjustSchema = z.object({ delta: z.number().int().refine(n => n !== 0), reason: z.string().min(3), note: z.string().optional() });

router.post("/inventory/:id/adjust", requirePermission("inventory.write"), async (req: Request, res: Response) => {
  const parsed = AdjustSchema.safeParse(req.body);
  if (!parsed.success) { badRequest(res, parsed.error.errors[0].message); return; }
  const { delta, note } = parsed.data;
  await withTransaction(async (client) => {
    const lockRes = await client.query("SELECT id, on_hand, reserved FROM inventory_items WHERE id = $1 FOR UPDATE", [req.params.id]);
    if (!lockRes.rowCount) { notFound(res, "Inventory item"); return; }
    const ii = lockRes.rows[0];
    const newOnHand = ii.on_hand + delta;
    if (newOnHand < 0) { fail(res, 400, "Tồn kho không thể âm", "NEGATIVE_STOCK"); return; }
    if (newOnHand < ii.reserved) { fail(res, 400, "Tồn kho không thể nhỏ hơn lượng đang giữ", "BELOW_RESERVED"); return; }
    await client.query("UPDATE inventory_items SET on_hand = $1 WHERE id = $2", [newOnHand, req.params.id]);
    await client.query("INSERT INTO inventory_movements (inventory_item_id, type, quantity, note, created_by) VALUES ($1,'ADJUSTMENT',$2,$3,$4)", [req.params.id, delta, note??null, req.user!.userId]);
    await writeAudit({ actorUserId: req.user!.userId, action: "inventory.adjust", entityType: "inventory_items", entityId: req.params.id, beforeData: { onHand: ii.on_hand }, afterData: { onHand: newOnHand, delta } }, client);
  });
  ok(res, { message: "Đã điều chỉnh tồn kho" });
});

// ── Customers ────────────────────────────────────────────────────────────────
router.get("/customers", requirePermission("customers.read"), async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
  const q4 = qs(req.query.q);
  let where = "deleted_at IS NULL"; const params: unknown[] = []; let idx = 1;
  if (q4) { where += ` AND (full_name ILIKE $${idx} OR email ILIKE $${idx} OR phone ILIKE $${idx})`; params.push(`%${q4}%`); idx++; }
  const data = await query(`SELECT id, email, phone, full_name, status, created_at FROM users WHERE ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`, [...params, limit, offset]);
  const cnt = await query(`SELECT COUNT(*) FROM users WHERE ${where}`, params);
  paginated(res, data.rows, Number(cnt.rows[0].count), page, limit);
});

router.patch("/customers/:id", requirePermission("customers.write"), async (req: Request, res: Response) => {
  const { id } = req.params; const { status } = req.body as { status?: string };
  if (!status || !["ACTIVE","BLOCKED"].includes(status)) { badRequest(res, "Invalid status"); return; }
  await withTransaction(async (client) => {
    await client.query("UPDATE users SET status = $1 WHERE id = $2 AND deleted_at IS NULL", [status, id]);
    await writeAudit({ actorUserId: req.user!.userId, action: "customer.status_change", entityType: "users", entityId: id, afterData: { status } }, client);
  });
  ok(res, { message: "Đã cập nhật trạng thái khách hàng" });
});

// ── Promotions (Coupons) ──────────────────────────────────────────────────────
router.get("/promotions", requirePermission("promotions.read"), async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
  const data = await query(`SELECT c.*, (SELECT COUNT(*) FROM coupon_redemptions WHERE coupon_id=c.id) AS used_count FROM coupons c ORDER BY c.created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]);
  const cnt = await query("SELECT COUNT(*) FROM coupons");
  paginated(res, data.rows, Number(cnt.rows[0].count), page, limit);
});

const CouponSchema = z.object({ code: z.string().min(2).max(50), name: z.string().min(2), type: z.enum(["PERCENTAGE","FIXED_AMOUNT","FREE_SHIPPING"]), scope: z.enum(["ORDER","PRODUCT","CATEGORY"]).default("ORDER"), value: z.number().positive(), minimumOrder: z.number().nonnegative().default(0), maximumDiscount: z.number().optional(), usageLimit: z.number().int().positive().optional(), usageLimitPerUser: z.number().int().positive().optional(), startsAt: z.string().datetime(), endsAt: z.string().datetime() });

router.post("/promotions", requirePermission("promotions.write"), async (req: Request, res: Response) => {
  const parsed = CouponSchema.safeParse(req.body);
  if (!parsed.success) { badRequest(res, parsed.error.errors[0].message); return; }
  const d = parsed.data; const id = uuid();
  await withTransaction(async (client) => {
    await client.query(`INSERT INTO coupons (id,code,name,type,scope,value,minimum_order,maximum_discount,usage_limit,usage_limit_per_user,starts_at,ends_at) VALUES ($1,UPPER($2),$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [id,d.code,d.name,d.type,d.scope,d.value,d.minimumOrder,d.maximumDiscount??null,d.usageLimit??null,d.usageLimitPerUser??null,d.startsAt,d.endsAt]);
    await writeAudit({ actorUserId: req.user!.userId, action: "coupon.create", entityType: "coupons", entityId: id, afterData: d }, client);
  });
  ok(res, { id }, 201);
});

// ── Reviews ───────────────────────────────────────────────────────────────────
router.get("/reviews", requirePermission("reviews.read"), async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
  const status5 = qs(req.query.status);
  let where = "1=1"; const params: unknown[] = []; let idx = 1;
  if (status5) { where += ` AND r.status = $${idx++}`; params.push(status5); }
  const data = await query(`SELECT r.id, r.rating, r.title, r.content, r.status, r.created_at, r.verified_purchase, u.full_name AS reviewer, p.name AS product FROM reviews r JOIN users u ON u.id=r.user_id JOIN products p ON p.id=r.product_id WHERE ${where} ORDER BY r.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`, [...params, limit, offset]);
  const cnt = await query(`SELECT COUNT(*) FROM reviews r WHERE ${where}`, params);
  paginated(res, data.rows, Number(cnt.rows[0].count), page, limit);
});

router.patch("/reviews/:id", requirePermission("reviews.write"), async (req: Request, res: Response) => {
  const { id } = req.params; const { status } = req.body as { status: string };
  if (!["APPROVED","REJECTED"].includes(status)) { badRequest(res, "Invalid status"); return; }
  await withTransaction(async (client) => {
    await client.query("UPDATE reviews SET status=$1, moderated_by=$2, moderated_at=NOW() WHERE id=$3", [status, req.user!.userId, id]);
    await writeAudit({ actorUserId: req.user!.userId, action: "review.moderate", entityType: "reviews", entityId: id, afterData: { status } }, client);
  });
  ok(res, { message: "Đã cập nhật đánh giá" });
});

// ── Staff & RBAC ──────────────────────────────────────────────────────────────
router.get("/staff", requirePermission("staff.read"), async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
  const data = await query(`SELECT u.id, u.email, u.phone, u.full_name, u.status, json_agg(r.code) AS roles FROM users u LEFT JOIN user_roles ur ON ur.user_id=u.id LEFT JOIN roles r ON r.id=ur.role_id WHERE EXISTS (SELECT 1 FROM user_roles ur2 WHERE ur2.user_id=u.id) AND u.deleted_at IS NULL GROUP BY u.id ORDER BY u.created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]);
  const cnt = await query("SELECT COUNT(DISTINCT u.id) FROM users u WHERE EXISTS (SELECT 1 FROM user_roles WHERE user_id=u.id) AND deleted_at IS NULL");
  paginated(res, data.rows, Number(cnt.rows[0].count), page, limit);
});

router.get("/roles", requirePermission("staff.read"), async (_req: Request, res: Response) => {
  const data = await query(`SELECT r.id, r.code, r.name, r.is_system, json_agg(p.code) AS permissions FROM roles r LEFT JOIN role_permissions rp ON rp.role_id=r.id LEFT JOIN permissions p ON p.id=rp.permission_id GROUP BY r.id`);
  ok(res, data.rows);
});

router.post("/staff/:userId/roles", requirePermission("staff.write"), async (req: Request, res: Response) => {
  const { userId } = req.params; const { roleId, action } = req.body as { roleId: string; action: "assign"|"revoke" };
  if (!["assign","revoke"].includes(action)) { badRequest(res, "action must be assign or revoke"); return; }
  if (userId === req.user!.userId && action === "revoke") { fail(res, 400, "Không thể tự gỡ quyền của mình", "SELF_REVOKE"); return; }
  await withTransaction(async (client) => {
    if (action === "assign") {
      await client.query("INSERT INTO user_roles (user_id, role_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [userId, roleId]);
    } else {
      await client.query("DELETE FROM user_roles WHERE user_id=$1 AND role_id=$2", [userId, roleId]);
    }
    await writeAudit({ actorUserId: req.user!.userId, action: `staff.role.${action}`, entityType: "user_roles", entityId: userId, afterData: { roleId } }, client);
  });
  ok(res, { message: `Đã ${action === "assign" ? "gán" : "gỡ"} vai trò` });
});

// ── Returns ───────────────────────────────────────────────────────────────────
router.get("/returns", requirePermission("orders.write"), async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
  const data = await query(`SELECT rr.*, o.code AS order_code, u.full_name AS customer FROM return_requests rr JOIN orders o ON o.id=rr.order_id LEFT JOIN users u ON u.id=rr.user_id ORDER BY rr.requested_at DESC LIMIT $1 OFFSET $2`, [limit, offset]);
  const cnt = await query("SELECT COUNT(*) FROM return_requests");
  paginated(res, data.rows, Number(cnt.rows[0].count), page, limit);
});

const RETURN_TRANSITIONS: Record<string, string[]> = { REQUESTED: ["APPROVED","REJECTED"], APPROVED: ["RECEIVED"], RECEIVED: ["REFUNDED","CLOSED"] };

router.patch("/returns/:id", requirePermission("orders.write"), async (req: Request, res: Response) => {
  const { id } = req.params; const { status, adminNote } = req.body as { status: string; adminNote?: string };
  const ret = await query("SELECT id, status FROM return_requests WHERE id = $1", [id]);
  if (!ret.rowCount) { notFound(res, "Return request"); return; }
  const current = ret.rows[0].status;
  const allowed = RETURN_TRANSITIONS[current] ?? [];
  if (!allowed.includes(status)) { fail(res, 400, `Invalid transition ${current} → ${status}`, "INVALID_TRANSITION"); return; }
  await withTransaction(async (client) => {
    await client.query("UPDATE return_requests SET status=$1, admin_note=$2, resolved_at=CASE WHEN $1 IN ('REFUNDED','CLOSED','REJECTED') THEN NOW() ELSE resolved_at END WHERE id=$3", [status, adminNote??null, id]);
    await writeAudit({ actorUserId: req.user!.userId, action: "return.status_change", entityType: "return_requests", entityId: id, beforeData: { status: current }, afterData: { status } }, client);
  });
  ok(res, { message: "Đã cập nhật yêu cầu đổi trả" });
});

// ── Audit ─────────────────────────────────────────────────────────────────────
router.get("/audit", requirePermission("audit.read"), async (req: Request, res: Response) => {
  const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
  const entityType6 = qs(req.query.entityType);
  const action6 = qs(req.query.action);
  let where = "1=1"; const params: unknown[] = []; let idx = 1;
  if (entityType6) { where += ` AND al.entity_type = $${idx++}`; params.push(entityType6); }
  if (action6) { where += ` AND al.action ILIKE $${idx++}`; params.push(`%${action6}%`); }
  const data = await query(`SELECT al.id, al.action, al.entity_type, al.entity_id, al.created_at, al.ip_address, u.full_name AS actor FROM audit_logs al LEFT JOIN users u ON u.id=al.actor_user_id WHERE ${where} ORDER BY al.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`, [...params, limit, offset]);
  const cnt = await query(`SELECT COUNT(*) FROM audit_logs al WHERE ${where}`, params);
  paginated(res, data.rows, Number(cnt.rows[0].count), page, limit);
});

// ── Settings ──────────────────────────────────────────────────────────────────
router.get("/settings", requirePermission("settings.read"), async (_req: Request, res: Response) => {
  const data = await query("SELECT key, value, description, is_public FROM store_settings ORDER BY key");
  ok(res, Object.fromEntries(data.rows.map(r => [r.key, r.value])));
});

router.patch("/settings", requirePermission("settings.write"), async (req: Request, res: Response) => {
  const settings = req.body as Record<string, unknown>;
  await withTransaction(async (client) => {
    for (const [key, value] of Object.entries(settings)) {
      await client.query(`INSERT INTO store_settings (key, value, updated_by) VALUES ($1,$2,$3) ON CONFLICT (key) DO UPDATE SET value=$2, updated_by=$3, updated_at=NOW()`, [key, JSON.stringify(value), req.user!.userId]);
    }
    await writeAudit({ actorUserId: req.user!.userId, action: "settings.update", entityType: "store_settings", afterData: settings }, client);
  });
  ok(res, { message: "Đã lưu cài đặt" });
});

// ── Reports ───────────────────────────────────────────────────────────────────
router.get("/reports/revenue", requirePermission("reports.read"), async (req: Request, res: Response) => {
  const { from, to } = req.query as Record<string, string>;
  const result = await query(
    `SELECT DATE(placed_at) AS date, SUM(grand_total) AS revenue, COUNT(*) AS orders FROM orders WHERE status NOT IN ('CANCELLED') AND placed_at BETWEEN $1 AND $2 GROUP BY date ORDER BY date`,
    [from ?? new Date(Date.now() - 30*86400000).toISOString(), to ?? new Date().toISOString()]
  );
  ok(res, result.rows);
});

export default router;

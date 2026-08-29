// Catalog routes: products, categories
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { query } from "../lib/db.js";
import { ok, paginated, notFound, badRequest } from "../lib/response.js";
import { parsePagination } from "../lib/response.js";

const router = Router();

// ── Categories ───────────────────────────────────────────────────────────────
router.get("/categories", async (_req: Request, res: Response) => {
  const result = await query(
    `SELECT id, parent_id, name, slug, description, image_url, position
     FROM categories WHERE active = TRUE ORDER BY position ASC, name ASC`
  );
  ok(res, result.rows);
});

// ── Products list ────────────────────────────────────────────────────────────
const ProductQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  category: z.string().optional(),
  q: z.string().optional(),
  size: z.string().optional(),
  sort: z.enum(["popular", "asc", "desc", "newest"]).optional(),
  featured: z.coerce.boolean().optional(),
});

router.get("/products", async (req: Request, res: Response) => {
  const parsed = ProductQuerySchema.safeParse(req.query);
  if (!parsed.success) { badRequest(res, "Invalid query params"); return; }
  const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
  const { category, q, size, sort, featured } = parsed.data;

  let where = "p.status = 'ACTIVE' AND p.deleted_at IS NULL";
  const params: unknown[] = [];
  let idx = 1;

  if (category) { where += ` AND cat.slug = $${idx++}`; params.push(category); }
  if (featured) { where += ` AND p.featured = TRUE`; }
  if (q) {
    where += ` AND to_tsvector('simple', p.name || ' ' || COALESCE(p.short_description,'')) @@ plainto_tsquery('simple', $${idx++})`;
    params.push(q);
  }
  if (size) {
    where += ` AND EXISTS (
      SELECT 1 FROM product_variants pv
      JOIN variant_option_values vov ON vov.variant_id = pv.id
      JOIN product_option_values pov ON pov.id = vov.option_value_id
      JOIN product_options po ON po.id = vov.option_id
      WHERE pv.product_id = p.id AND po.name ILIKE 'size' AND pov.value = $${idx++} AND pv.active = TRUE
    )`;
    params.push(size);
  }

  const orderMap: Record<string, string> = {
    asc: "min_price ASC",
    desc: "min_price DESC",
    newest: "p.published_at DESC",
    popular: "p.id ASC",
  };
  const orderBy = orderMap[sort ?? "popular"];

  const dataQuery = `
    SELECT p.id, p.name, p.slug, p.short_description, p.material, p.metadata,
           p.featured, p.published_at,
           cat.name AS category_name, cat.slug AS category_slug,
           (SELECT url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.position LIMIT 1) AS image_url,
           MIN(pv.price) AS min_price,
           MAX(pv.compare_at_price) AS max_compare_price,
           COALESCE(AVG(r.rating), 0)::numeric(3,1) AS avg_rating,
           COUNT(DISTINCT r.id) AS review_count
    FROM products p
    JOIN categories cat ON cat.id = p.category_id
    LEFT JOIN product_variants pv ON pv.product_id = p.id AND pv.active = TRUE
    LEFT JOIN reviews r ON r.product_id = p.id AND r.status = 'APPROVED'
    WHERE ${where}
    GROUP BY p.id, cat.name, cat.slug
    ORDER BY ${orderBy}
    LIMIT $${idx++} OFFSET $${idx++}
  `;
  const countQuery = `
    SELECT COUNT(DISTINCT p.id) AS total
    FROM products p
    JOIN categories cat ON cat.id = p.category_id
    WHERE ${where}
  `;

  const [data, count] = await Promise.all([
    query(dataQuery, [...params, limit, offset]),
    query(countQuery, params),
  ]);

  paginated(res, data.rows, Number(count.rows[0].total), page, limit);
});

// ── Product detail ───────────────────────────────────────────────────────────
router.get("/products/:slug", async (req: Request, res: Response) => {
  const { slug } = req.params;

  const productResult = await query(
    `SELECT p.id, p.name, p.slug, p.description, p.short_description, p.material, p.care_instructions,
            p.seo_title, p.seo_description, p.metadata, p.featured,
            cat.name AS category_name, cat.slug AS category_slug,
            COALESCE(AVG(r.rating), 0)::numeric(3,1) AS avg_rating,
            COUNT(DISTINCT r.id) AS review_count
     FROM products p
     JOIN categories cat ON cat.id = p.category_id
     LEFT JOIN reviews r ON r.product_id = p.id AND r.status = 'APPROVED'
     WHERE p.slug = $1 AND p.status = 'ACTIVE' AND p.deleted_at IS NULL
     GROUP BY p.id, cat.name, cat.slug`,
    [slug]
  );
  if (!productResult.rowCount) { notFound(res, "Product"); return; }
  const product = productResult.rows[0];

  const [images, options, variants, reviews] = await Promise.all([
    query(`SELECT id, url, alt_text, position FROM product_images WHERE product_id = $1 ORDER BY position`, [product.id]),
    query(`SELECT po.id, po.name, po.position,
                  json_agg(json_build_object('id', pov.id, 'value', pov.value, 'colorHex', pov.color_hex, 'position', pov.position) ORDER BY pov.position) AS values
           FROM product_options po
           JOIN product_option_values pov ON pov.option_id = po.id
           WHERE po.product_id = $1
           GROUP BY po.id ORDER BY po.position`, [product.id]),
    query(`SELECT pv.id, pv.sku, pv.price, pv.compare_at_price, pv.active,
                  ii.on_hand, ii.reserved, (ii.on_hand - ii.reserved) AS available,
                  json_agg(json_build_object('optionId', vov.option_id, 'optionValueId', vov.option_value_id)) AS option_values
           FROM product_variants pv
           LEFT JOIN inventory_items ii ON ii.variant_id = pv.id
           LEFT JOIN variant_option_values vov ON vov.variant_id = pv.id
           WHERE pv.product_id = $1 AND pv.active = TRUE
           GROUP BY pv.id, ii.on_hand, ii.reserved`, [product.id]),
    query(`SELECT r.id, r.rating, r.title, r.content, r.created_at, r.verified_purchase,
                  u.full_name AS reviewer_name
           FROM reviews r JOIN users u ON u.id = r.user_id
           WHERE r.product_id = $1 AND r.status = 'APPROVED'
           ORDER BY r.created_at DESC LIMIT 5`, [product.id]),
  ]);

  ok(res, {
    ...product,
    images: images.rows,
    options: options.rows,
    variants: variants.rows,
    recentReviews: reviews.rows,
  });
});

export default router;

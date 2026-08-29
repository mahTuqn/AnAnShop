import { NextRequest } from "next/server";
import { adminRoute } from "@/lib/server/admin";
import { AppError } from "@/modules/shared";

const reportTypes = ["revenue", "orders", "products", "inventory", "customers"] as const;

export const GET = (request: NextRequest) => adminRoute(request, "reports.read", async ({ db }) => {
  const type = request.nextUrl.searchParams.get("type") ?? "revenue";
  if (!reportTypes.includes(type as (typeof reportTypes)[number])) throw new AppError("VALIDATION_ERROR", "Loại báo cáo không hợp lệ", 400);
  const days = Number(request.nextUrl.searchParams.get("days") ?? 30);
  if (!Number.isInteger(days) || days < 1 || days > 366) throw new AppError("VALIDATION_ERROR", "Khoảng báo cáo phải từ 1 đến 366 ngày", 400);
  let columns: string[];
  let rows: Array<Record<string, unknown>>;
  if (type === "revenue") {
    columns = ["date", "order_count", "non_cancelled_revenue", "paid_revenue", "cancelled_orders", "refunded_amount"];
    rows = await db.$queryRawUnsafe(`SELECT d::date::text AS date,COUNT(DISTINCT o.id)::int AS order_count,
      COALESCE(SUM(o.grand_total) FILTER (WHERE o.status<>'CANCELLED'),0)::text AS non_cancelled_revenue,COALESCE(SUM(o.grand_total) FILTER (WHERE o.payment_status='PAID'),0)::text AS paid_revenue,
      COUNT(DISTINCT o.id) FILTER (WHERE o.status='CANCELLED')::int AS cancelled_orders,
      COALESCE((SELECT SUM(r.amount) FROM refunds r WHERE r.created_at::date=d::date AND r.status NOT IN ('FAILED','CANCELLED')),0)::text AS refunded_amount
      FROM generate_series(CURRENT_DATE-$1::int+1,CURRENT_DATE,'1 day') d LEFT JOIN orders o ON o.placed_at::date=d::date GROUP BY d ORDER BY d`, days);
  } else if (type === "orders") {
    columns = ["code", "status", "payment_status", "customer", "grand_total", "placed_at"];
    rows = await db.$queryRawUnsafe(`SELECT o.code,o.status::text,o.payment_status::text,COALESCE(u.full_name,o.guest_email,o.guest_phone,'Khách vãng lai') AS customer,
      o.grand_total::text,o.placed_at FROM orders o LEFT JOIN users u ON u.id=o.user_id WHERE o.placed_at>=CURRENT_DATE-$1::int+1 ORDER BY o.placed_at DESC`, days);
  } else if (type === "products") {
    columns = ["product", "category", "units_sold", "revenue", "available_stock"];
    rows = await db.$queryRawUnsafe(`SELECT p.name AS product,c.name AS category,
      COALESCE((SELECT SUM(oi.quantity) FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE oi.product_id=p.id AND o.placed_at>=CURRENT_DATE-$1::int+1 AND o.status<>'CANCELLED'),0)::int AS units_sold,
      COALESCE((SELECT SUM(oi.line_total) FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE oi.product_id=p.id AND o.placed_at>=CURRENT_DATE-$1::int+1 AND o.status<>'CANCELLED'),0)::text AS revenue,
      COALESCE((SELECT SUM(ii.on_hand-ii.reserved) FROM product_variants pv JOIN inventory_items ii ON ii.variant_id=pv.id WHERE pv.product_id=p.id),0)::int AS available_stock
      FROM products p JOIN categories c ON c.id=p.category_id WHERE p.deleted_at IS NULL ORDER BY units_sold DESC,p.name`, days);
  } else if (type === "inventory") {
    columns = ["sku", "product", "on_hand", "reserved", "available", "low_stock_level", "state"];
    rows = await db.$queryRawUnsafe(`SELECT pv.sku,p.name AS product,ii.on_hand,ii.reserved,(ii.on_hand-ii.reserved) AS available,ii.low_stock_level,
      CASE WHEN ii.on_hand-ii.reserved<=0 THEN 'OUT_OF_STOCK' WHEN ii.on_hand-ii.reserved<=ii.low_stock_level THEN 'LOW_STOCK' ELSE 'NORMAL' END AS state
      FROM inventory_items ii JOIN product_variants pv ON pv.id=ii.variant_id JOIN products p ON p.id=pv.product_id ORDER BY available,pv.sku`);
  } else {
    columns = ["customer", "email", "phone", "status", "order_count", "lifetime_spend", "last_order_at"];
    rows = await db.$queryRawUnsafe(`SELECT u.full_name AS customer,u.email,u.phone,u.status::text,COUNT(o.id)::int AS order_count,
      COALESCE(SUM(o.grand_total) FILTER (WHERE o.status='DELIVERED'),0)::text AS lifetime_spend,MAX(o.placed_at) AS last_order_at
      FROM users u LEFT JOIN orders o ON o.user_id=u.id WHERE u.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.code IN ('ADMIN','STAFF'))
      GROUP BY u.id ORDER BY COALESCE(SUM(o.grand_total) FILTER (WHERE o.status='DELIVERED'),0) DESC,u.full_name`);
  }
  return { data: { type, days, generatedAt: new Date().toISOString(), columns, rows } };
});

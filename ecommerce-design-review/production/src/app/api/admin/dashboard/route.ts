import { NextRequest } from "next/server";
import { adminRoute } from "@/lib/server/admin";
import { serializeDashboardSummary, type DashboardSummaryRow } from "@/lib/admin/dashboard-summary";

export const GET = (request: NextRequest) => adminRoute(request, "reports.read", async ({ db }) => {
  const pendingOrders = await db.order.count({ where: { status: "PENDING" } });
  const summary: DashboardSummaryRow = {
    orders_today: BigInt(0), revenue_today: "0", pending_orders: BigInt(pendingOrders),
    low_stock: BigInt(0), pending_returns: BigInt(0),
    total_revenue: "0", month_revenue: "0", total_orders: BigInt(0),
    processing_orders: BigInt(0), cancelled_orders: BigInt(0),
    total_customers: BigInt(0), total_products: BigInt(0),
  };
  const [orderStatuses, revenueSeries, topProducts, topCategories] = await Promise.all([
    db.$queryRawUnsafe<Array<{ status: string; count: bigint }>>("SELECT status::text,COUNT(*)::bigint AS count FROM orders GROUP BY status ORDER BY status"),
    db.$queryRawUnsafe<Array<{ date: string; revenue: string }>>(`SELECT d::date::text AS date,COALESCE(SUM(o.grand_total) FILTER (WHERE o.payment_status='PAID'),0)::text AS revenue
      FROM generate_series(CURRENT_DATE-6,CURRENT_DATE,'1 day') d LEFT JOIN orders o ON o.placed_at::date=d::date GROUP BY d ORDER BY d`),
    db.$queryRawUnsafe<Array<{ name: string; units_sold: number; revenue: string }>>(`SELECT oi.product_name AS name,SUM(oi.quantity)::int AS units_sold,SUM(oi.line_total)::text AS revenue
      FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.status<>'CANCELLED' GROUP BY oi.product_name ORDER BY units_sold DESC LIMIT 5`),
    db.$queryRawUnsafe<Array<{ name: string; units_sold: number; revenue: string }>>(`SELECT c.name,SUM(oi.quantity)::int AS units_sold,SUM(oi.line_total)::text AS revenue
      FROM order_items oi JOIN orders o ON o.id=oi.order_id JOIN products p ON p.id=oi.product_id JOIN categories c ON c.id=p.category_id
      WHERE o.status<>'CANCELLED' GROUP BY c.id ORDER BY SUM(oi.line_total) DESC LIMIT 5`),
  ]);
  return { data: { ...serializeDashboardSummary(summary), orderStatuses: orderStatuses.map((row) => ({ status: row.status, count: Number(row.count) })), revenueSeries, topProducts, topCategories } };
});


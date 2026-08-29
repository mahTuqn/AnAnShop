export type DashboardSummaryRow = {
  orders_today: bigint | number | string;
  revenue_today: bigint | number | string;
  pending_orders: bigint | number | string;
  low_stock: bigint | number | string;
  pending_returns: bigint | number | string;
  total_revenue: bigint | number | string;
  month_revenue: bigint | number | string;
  total_orders: bigint | number | string;
  processing_orders: bigint | number | string;
  cancelled_orders: bigint | number | string;
  total_customers: bigint | number | string;
  total_products: bigint | number | string;
};

export type DashboardSummary = {
  orders_today: number;
  revenue_today: string;
  pending_orders: number;
  low_stock: number;
  pending_returns: number;
  total_revenue: string;
  month_revenue: string;
  total_orders: number;
  processing_orders: number;
  cancelled_orders: number;
  total_customers: number;
  total_products: number;
  cancellation_rate: number;
};

/** PostgreSQL COUNT returns bigint; normalize it before passing data to JSON. */
export function serializeDashboardSummary(row: DashboardSummaryRow): DashboardSummary {
  return {
    orders_today: Number(row.orders_today),
    revenue_today: String(row.revenue_today),
    pending_orders: Number(row.pending_orders),
    low_stock: Number(row.low_stock),
    pending_returns: Number(row.pending_returns),
    total_revenue: String(row.total_revenue),
    month_revenue: String(row.month_revenue),
    total_orders: Number(row.total_orders),
    processing_orders: Number(row.processing_orders),
    cancelled_orders: Number(row.cancelled_orders),
    total_customers: Number(row.total_customers),
    total_products: Number(row.total_products),
    cancellation_rate: Number(row.total_orders) ? Number(((Number(row.cancelled_orders) / Number(row.total_orders)) * 100).toFixed(2)) : 0,
  };
}

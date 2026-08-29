import { describe, expect, it } from "vitest";
import { serializeDashboardSummary } from "@/lib/admin/dashboard-summary";

describe("admin dashboard JSON contract", () => {
  it("converts PostgreSQL COUNT bigint values and preserves revenue as a string", () => {
    const summary = serializeDashboardSummary({
      orders_today: 3n,
      revenue_today: "1250000.00",
      pending_orders: 2n,
      low_stock: 4n,
      pending_returns: 1n,
      total_revenue: "21800000.00",
      month_revenue: "7200000.00",
      total_orders: 20n,
      processing_orders: 4n,
      cancelled_orders: 2n,
      total_customers: 13n,
      total_products: 9n,
    });

    expect(summary).toEqual({
      orders_today: 3,
      revenue_today: "1250000.00",
      pending_orders: 2,
      low_stock: 4,
      pending_returns: 1,
      total_revenue: "21800000.00",
      month_revenue: "7200000.00",
      total_orders: 20,
      processing_orders: 4,
      cancelled_orders: 2,
      total_customers: 13,
      total_products: 9,
      cancellation_rate: 10,
    });
    expect(() => JSON.stringify(summary)).not.toThrow();
  });
});

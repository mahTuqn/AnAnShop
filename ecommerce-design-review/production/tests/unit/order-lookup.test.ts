import { describe, expect, it } from "vitest";
import { orderLookupWhere } from "@/lib/server/order-lookup";

describe("order lookup selector", () => {
  it("uses the UUID primary key for an order id", () => {
    expect(orderLookupWhere("550e8400-e29b-41d4-a716-446655440000")).toEqual({ id: "550e8400-e29b-41d4-a716-446655440000" });
  });

  it("uses the exact unique code for customer-facing order references", () => {
    expect(orderLookupWhere("AN260829123456")).toEqual({ code: "AN260829123456" });
  });

  it("does not classify malformed UUID-like input as an id", () => {
    expect(orderLookupWhere("AN-not-a-uuid")).toEqual({ code: "AN-not-a-uuid" });
  });
});

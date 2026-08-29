import { describe, expect, it } from "vitest";
import { FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING_FEE, shippingFor } from "@/modules/checkout";
import { vnd } from "@/modules/shared";

describe("shipping contract", () => {
  it("uses the canonical 699k free-shipping threshold", () => {
    expect(FREE_SHIPPING_THRESHOLD).toBe(699_000);
    expect(shippingFor(vnd(698_999), null)).toBe(STANDARD_SHIPPING_FEE);
    expect(shippingFor(vnd(699_000), null)).toBe(0);
  });

  it("honors free-shipping coupons below the threshold", () => {
    expect(shippingFor(vnd(100_000), { couponId: "c", code: "FREE", amount: vnd(0), freeShipping: true })).toBe(0);
  });
});

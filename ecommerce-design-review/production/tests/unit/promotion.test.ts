import { describe, expect, it } from "vitest";
import { PromotionService, type CouponRepository } from "@/modules/promotion";
import { vnd } from "@/modules/shared";

describe("PromotionService", () => {
  const coupons: CouponRepository = { findByCode: async (code) => code === "ANAN10" ? { id: "cp1", code, type: "PERCENTAGE", value: 10, minimumOrder: vnd(500_000), maximumDiscount: vnd(100_000), used: 0, startsAt: new Date("2026-01-01"), endsAt: new Date("2027-01-01"), active: true } : null };
  const service = new PromotionService(coupons, { now: () => new Date("2026-08-28") });

  it("tính giảm giá trên server và áp trần", async () => {
    const result = await service.evaluate("anan10", vnd(2_000_000));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value?.amount).toBe(100_000);
  });

  it("từ chối đơn chưa đạt tối thiểu", async () => {
    const result = await service.evaluate("ANAN10", vnd(499_000));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INVALID_COUPON");
  });
});


import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { canTransitionOrder } from "@/modules/admin/state-machine";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("critical commerce lifecycle contracts", () => {
  it("does not directly cancel an order once picking has started", () => {
    expect(canTransitionOrder("PENDING", "CANCELLED")).toBe(true);
    expect(canTransitionOrder("CONFIRMED", "CANCELLED")).toBe(true);
    expect(canTransitionOrder("PROCESSING", "CANCELLED")).toBe(false);
  });

  it("reserves at checkout, sells only on delivery and releases on cancellation", () => {
    const checkout = read("src/lib/server/persistent-store.ts");
    const transition = read("src/app/api/admin/orders/[id]/transition/route.ts");
    expect(checkout).toContain("reserve_inventory");
    expect(checkout).not.toContain("reserved: 0");
    expect(transition).toContain("release_inventory");
    expect(transition).toContain("fulfill_inventory");
    expect(transition).toContain("trackingCode");
  });

  it("restores stock only after receipt and requires reconciled refunds", () => {
    const returns = read("src/app/api/admin/returns/[id]/transition/route.ts");
    expect(returns).toContain("return_inventory");
    expect(returns).toContain('resolution === "RESTOCK"');
    expect(returns).toContain("Chưa có đủ giao dịch hoàn tiền");
  });

  it("returns voucher usage when an unpaid order is cancelled and enforces scope", () => {
    const actions = read("src/app/api/orders/[id]/actions/route.ts");
    const store = read("src/lib/server/persistent-store.ts");
    expect(actions).toContain("DELETE FROM coupon_redemptions");
    expect(store).toContain('coupon.scope === "PRODUCT"');
    expect(store).toContain('coupon.scope === "CATEGORY"');
    expect(store).toContain("eligibleSubtotal");
  });

  it("protects staff sessions and the last active administrator", () => {
    const staff = read("src/app/api/admin/staff/[id]/route.ts");
    const roles = read("src/modules/admin/rbac.ts");
    expect(staff).toContain("Không thể tự khóa");
    expect(staff).toContain("type='REFRESH_TOKEN'");
    expect(roles).toContain("activeAdminCount <= 1");
    expect(roles).toContain("Không thể tự thu hồi");
  });
});
import { describe, expect, it } from "vitest";
import { assertOrderTransition, assertReturnTransition, canTransitionOrder, canTransitionReturn } from "@/modules/admin/state-machine";

describe("admin state machines", () => {
  it("cho phép order đi tuần tự và khóa trạng thái kết thúc", () => {
    expect(canTransitionOrder("PENDING", "CONFIRMED")).toBe(true);
    expect(canTransitionOrder("PENDING", "DELIVERED")).toBe(false);
    expect(canTransitionOrder("CANCELLED", "CONFIRMED")).toBe(false);
    expect(assertOrderTransition("SHIPPING", "CANCELLED").ok).toBe(false);
    expect(canTransitionOrder("PROCESSING", "CANCELLED")).toBe(false);
  });

  it("không cho return bỏ qua phê duyệt và tiếp nhận", () => {
    expect(canTransitionReturn("REQUESTED", "APPROVED")).toBe(true);
    expect(canTransitionReturn("REQUESTED", "REFUNDED")).toBe(false);
    expect(canTransitionReturn("APPROVED", "RECEIVED")).toBe(true);
    expect(assertReturnTransition("CLOSED", "APPROVED").ok).toBe(false);
  });
});


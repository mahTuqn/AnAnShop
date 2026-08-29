import { describe, expect, it } from "vitest";
import { signGuestOrderLookup, verifyGuestOrderLookup } from "@/lib/server/guest-order-token";

describe("guest order lookup token", () => {
  it("xác minh token hợp lệ và từ chối token bị sửa", () => {
    const token = signGuestOrderLookup("order-id", "AN260828000001", 60);
    expect(verifyGuestOrderLookup(token)).toMatchObject({ orderId: "order-id", code: "AN260828000001" });
    expect(() => verifyGuestOrderLookup(`${token}x`)).toThrow("Liên kết tra cứu không hợp lệ");
  });
});

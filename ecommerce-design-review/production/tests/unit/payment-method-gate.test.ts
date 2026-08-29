import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("payment availability gate", () => {
  it("does not accept external payment methods before provider adapters exist", () => {
    const handler = readFileSync(resolve(process.cwd(), "src/lib/server/checkout-handler.ts"), "utf8");
    expect(handler).toContain(`const methods: Order["paymentMethod"][] = ["COD"]`);
    expect(handler).not.toContain(`["COD", "MOMO", "VNPAY", "CARD"]`);
  });
});

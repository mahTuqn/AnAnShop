import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const schema = readFileSync(resolve(process.cwd(), "../database/schema.sql"), "utf8");
const migration = readFileSync(resolve(process.cwd(), "../database/migrations/0003_store_settings_and_refund_idempotency.sql"), "utf8");
const store = readFileSync(resolve(process.cwd(), "src/lib/server/persistent-store.ts"), "utf8");

describe("canonical SQL schema contract", () => {
  it("keeps settings and refund idempotency in both baseline and migration", () => {
    for (const sql of [schema, migration]) {
      expect(sql).toContain("store_settings");
      expect(sql).toContain("uq_refunds_idempotency_key");
    }
  });

  it("writes coupon redemptions using columns that exist in the baseline schema", () => {
    expect(store).toContain("coupon_redemptions(coupon_id,order_id,user_id)");
    expect(store).not.toContain("coupon_redemptions(coupon_id,order_id,user_id,discount_amount)");
  });
});

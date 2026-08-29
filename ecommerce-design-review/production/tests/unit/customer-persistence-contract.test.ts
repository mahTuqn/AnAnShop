import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("persistent customer feature contracts", () => {
  it("scopes wishlist and notifications by authenticated user", () => {
    expect(read("src/app/api/account/wishlist/route.ts")).toContain("w.user_id=$1::uuid");
    expect(read("src/app/api/account/notifications/route.ts")).toContain("user_id=$2::uuid");
  });
  it("only marks reviews verified after a delivered owned order", () => {
    const reviews = read("src/app/api/reviews/route.ts");
    expect(reviews).toContain("o.user_id=$2::uuid");
    expect(reviews).toContain("o.status='DELIVERED'");
    expect(reviews).toContain("verified_purchase,status");
    expect(reviews).toContain("'PENDING'");
  });
});

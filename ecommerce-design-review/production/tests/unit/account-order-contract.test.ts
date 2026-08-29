import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("customer account and order security contracts", () => {
  it("scopes address mutations and order actions to the authenticated user", () => {
    expect(source("src/app/api/account/addresses/[id]/route.ts")).toContain("user_id=$2::uuid");
    expect(source("src/app/api/orders/[id]/actions/route.ts")).toContain("order.userId !== actor.userId");
  });

  it("changes passwords atomically and revokes persistent sessions", () => {
    const password = source("src/app/api/account/password/route.ts");
    expect(password).toContain("db.$transaction");
    expect(password).toContain("type='REFRESH_TOKEN'");
    expect(password).toContain("clearSessionCookie");
  });

  it("cancellation releases reservations before changing state", () => {
    const actions = source("src/app/api/orders/[id]/actions/route.ts");
    expect(actions.indexOf("release_inventory")).toBeLessThan(actions.indexOf(`status: "CANCELLED"`));
  });
});

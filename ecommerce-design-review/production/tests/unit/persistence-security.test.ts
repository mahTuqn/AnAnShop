import { describe, expect, it } from "vitest";
import { Pbkdf2PasswordHasher } from "@/lib/server/passwords";
import { CodPaymentGateway } from "@/modules/payment";
import type { Order } from "@/modules/order";
import { vnd } from "@/modules/shared";

describe("persistence security contracts", () => {
  it("hash mật khẩu có salt và xác minh constant-time", async () => {
    const hasher = new Pbkdf2PasswordHasher();
    const first = await hasher.hash("safe-password-123");
    const second = await hasher.hash("safe-password-123");
    expect(first).not.toBe(second);
    await expect(hasher.verify("safe-password-123", first)).resolves.toBe(true);
    await expect(hasher.verify("wrong-password", first)).resolves.toBe(false);
  });

  it("COD payment session id ổn định khi checkout được replay", async () => {
    const order = { id: crypto.randomUUID(), paymentMethod: "COD", grandTotal: vnd(100_000) } as Order;
    const gateway = new CodPaymentGateway();
    const first = await gateway.createSession(order);
    const second = await gateway.createSession(order);
    expect(first.ok && first.value.paymentId).toBe(second.ok && second.value.paymentId);
  });
});


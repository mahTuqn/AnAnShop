import { describe, expect, it } from "vitest";
import { CheckoutService, type CheckoutTransaction } from "@/modules/checkout";
import type { CartRepository } from "@/modules/cart";
import type { CatalogRepository } from "@/modules/catalog";
import type { Order, OrderRepository } from "@/modules/order";
import { CodPaymentGateway } from "@/modules/payment";
import { PromotionService } from "@/modules/promotion";
import { ok } from "@/modules/shared";

describe("checkout idempotency ownership", () => {
  it("always scopes replay lookup to the authenticated or guest owner", async () => {
    const calls: Array<[string, string]> = [];
    const orders: OrderRepository = {
      findByIdempotencyKey: async (key, owner) => { calls.push([key, owner]); return null; },
      findById: async () => null,
      listByOwner: async () => [],
    };
    const carts: CartRepository = { findActive: async () => null, save: async () => undefined };
    const catalog = {} as CatalogRepository;
    const transaction: CheckoutTransaction = { execute: async (order) => ok(order) };
    const service = new CheckoutService(carts, catalog, orders, new PromotionService({ findByCode: async () => null }), transaction, new CodPaymentGateway());
    await service.checkout({ ownerKey: "guest:owner-a", idempotencyKey: "same-public-key", paymentMethod: "COD", shippingAddress: {} as Order["address"] });
    await service.checkout({ ownerKey: "guest:owner-b", idempotencyKey: "same-public-key", paymentMethod: "COD", shippingAddress: {} as Order["address"] });
    expect(calls).toEqual([["same-public-key", "guest:owner-a"], ["same-public-key", "guest:owner-b"]]);
  });
});

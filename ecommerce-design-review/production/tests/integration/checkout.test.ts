import { describe, expect, it } from "vitest";
import { CheckoutService, type CheckoutTransaction } from "@/modules/checkout";
import type { CartRepository } from "@/modules/cart";
import type { CatalogRepository, ProductSummary } from "@/modules/catalog";
import type { Order, OrderRepository } from "@/modules/order";
import { CodPaymentGateway } from "@/modules/payment";
import { PromotionService } from "@/modules/promotion";
import { ok, vnd } from "@/modules/shared";

describe("checkout integration contract", () => {
  it("tái sử dụng đơn khi idempotency key được gửi lại", async () => {
    const product: ProductSummary = { id: "p1", slug: "dam-bau", name: "Đầm bầu", categorySlug: "do-bau", featured: true, variants: [{ id: "v1", sku: "SKU1", name: "M", price: vnd(600_000), available: 5, active: true }] };
    let persisted: Order | null = null;
    let transactions = 0;
    const carts: CartRepository = { findActive: async () => ({ id: "c1", ownerKey: "guest:test-session", currency: "VND", subtotal: vnd(600_000), updatedAt: new Date(), items: [{ id: "i1", variantId: "v1", product, variantName: "M", sku: "SKU1", quantity: 1, unitPrice: vnd(1), lineTotal: vnd(1) }] }), save: async () => {} };
    const catalog: CatalogRepository = { list: async () => ({ items: [product], page: 1, pageSize: 20, total: 1 }), findBySlug: async () => product, findVariant: async () => ({ product, variant: product.variants[0] }) };
    const orders: OrderRepository = { findByIdempotencyKey: async (key) => persisted?.idempotencyKey === key ? persisted : null, findById: async () => persisted, listByOwner: async () => persisted ? [persisted] : [] };
    const transaction: CheckoutTransaction = { execute: async (order) => { transactions += 1; persisted = order; return ok(order); } };
    const service = new CheckoutService(carts, catalog, orders, new PromotionService({ findByCode: async () => null }), transaction, new CodPaymentGateway(), { now: () => new Date("2026-08-28T00:00:00Z") });
    const command = { ownerKey: "guest:test-session", idempotencyKey: "checkout-unique-001", paymentMethod: "COD" as const, shippingAddress: { fullName: "An Nguyễn", phone: "0900000000", province: "HCM", district: "Quận 1", ward: "Bến Nghé", line1: "1 Lê Lợi" } };
    const first = await service.checkout(command);
    const second = await service.checkout(command);
    expect(first.ok && first.value.order.subtotal).toBe(600_000); // ignored client/stored price=1
    expect(second.ok && second.value.replayed).toBe(true);
    expect(transactions).toBe(1);
  });
});


import { describe, expect, it } from "vitest";
import { CartService, type Cart, type CartRepository } from "@/modules/cart";
import type { CatalogRepository, ProductSummary } from "@/modules/catalog";
import { vnd } from "@/modules/shared";

const product: ProductSummary = { id: "p1", slug: "dam-bau", name: "Đầm bầu", categorySlug: "do-bau", featured: true, variants: [{ id: "v1", sku: "SKU1", name: "M", price: vnd(200_000), available: 3, active: true }] };

function fixture() {
  let cart: Cart = { id: "c1", ownerKey: "guest:owner-a", currency: "VND", subtotal: vnd(200_000), updatedAt: new Date(), items: [{ id: "i1", variantId: "v1", product, variantName: "M", sku: "SKU1", quantity: 1, unitPrice: vnd(200_000), lineTotal: vnd(200_000) }] };
  const carts: CartRepository = { findActive: async (owner) => owner === cart.ownerKey ? structuredClone(cart) : null, save: async (value) => { cart = structuredClone(value); } };
  const catalog: CatalogRepository = { list: async () => ({ items: [product], page: 1, pageSize: 20, total: 1 }), findBySlug: async () => product, findVariant: async (id) => id === "v1" ? { product, variant: product.variants[0] } : null };
  return { service: new CartService(carts, catalog), current: () => cart };
}

describe("cart mutations", () => {
  it("updates quantity using the authoritative current price", async () => {
    const { service, current } = fixture();
    const result = await service.setQuantity("guest:owner-a", "i1", 3);
    expect(result.ok && result.value.subtotal).toBe(600_000);
    expect(current().items[0].quantity).toBe(3);
  });

  it("rejects another owner's item and stock overflow", async () => {
    const { service } = fixture();
    const missing = await service.setQuantity("guest:owner-b", "i1", 1);
    const overflow = await service.setQuantity("guest:owner-a", "i1", 4);
    expect(!missing.ok && missing.error.status).toBe(404);
    expect(!overflow.ok && overflow.error.code).toBe("OUT_OF_STOCK");
  });

  it("removes an owned line and recalculates totals", async () => {
    const { service } = fixture();
    const result = await service.remove("guest:owner-a", "i1");
    expect(result.ok && result.value.items).toHaveLength(0);
    expect(result.ok && result.value.subtotal).toBe(0);
  });
});

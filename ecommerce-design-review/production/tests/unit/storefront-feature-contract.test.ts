import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

describe("storefront customer feature contracts", () => {
  it("keeps cart selection stable and does not claim an unverified coupon discount", () => {
    const cart = source("src/components/storefront/cart-client-integrated.tsx");
    expect(cart).toContain("selectionInitialized");
    expect(cart).toContain("for (const item of selectedItems)");
    expect(cart).not.toContain("Promise.all(selectedItems");
    expect(cart).toContain("Mã được máy chủ kiểm tra và tính giảm giá");
    expect(cart).not.toContain("Đã áp dụng, giảm");
  });

  it("checkout starts without a fake address and sends supported server fields", () => {
    const checkout = source("src/components/storefront/checkout-client-v2.tsx");
    expect(checkout).toContain('fullName: ""');
    expect(checkout).toContain("/api/account/addresses");
    expect(checkout).toContain('shipping = "STANDARD"');
    expect(checkout).toContain("customerNote");
    expect(checkout).toContain("couponCode");
    expect(checkout).not.toContain("0901234567");
  });

  it("wires customer order actions and verified-purchase review UI", () => {
    const orders = source("src/components/storefront/account-order-detail-client.tsx");
    expect(orders).toContain('"CANCEL" | "RETURN" | "REBUY"');
    expect(orders).toContain("/actions");
    const detail = source("src/app/(storefront)/products/[slug]/page.tsx");
    expect(detail).toContain("ProductReviews");
    expect(detail).not.toContain("Sản phẩm giống ảnh");
  });

  it("uses persisted variant identifiers for wishlist and buy-now", () => {
    expect(source("src/components/storefront/wishlist-client.tsx")).toContain("variant.variantId");
    const product = source("src/components/storefront/product-detail-integrated.tsx");
    expect(product).toContain(".variantId");
    expect(product).not.toContain("var_dress_m_beige");
  });
});

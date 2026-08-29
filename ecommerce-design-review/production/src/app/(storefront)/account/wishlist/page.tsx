import { WishlistClient } from "@/components/storefront/wishlist-client";
import { getCatalog } from "@/lib/storefront/adapters-api";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const products = await getCatalog();
  return <section><h2 className="font-serif text-3xl">Sản phẩm yêu thích</h2><p className="mt-2 text-sm text-[#6b5e5e]">Những điều mẹ đã lưu để xem lại sau.</p><WishlistClient products={products}/></section>;
}
import { readFile, writeFile } from "node:fs/promises";

const replace = async (file, before, after) => {
  const source = await readFile(file, "utf8");
  if (!source.includes(before)) throw new Error(`Expected text not found in ${file}: ${before}`);
  await writeFile(file, source.replace(before, after), "utf8");
};

await replace("src/app/(storefront)/layout.tsx", 'from "@/components/storefront/site-shell"', 'from "@/components/storefront/site-shell-v2"');

for (const file of [
  "src/app/(storefront)/page.tsx",
  "src/app/(storefront)/products/page.tsx",
  "src/app/(storefront)/products/[slug]/page.tsx",
]) await replace(file, 'from "@/components/storefront/product-card"', 'from "@/components/storefront/product-card-v2"');

await replace("src/app/(storefront)/products/page.tsx", 'from "@/lib/storefront/adapters"', 'from "@/lib/storefront/adapters-api"');
await replace("src/app/(storefront)/products/[slug]/page.tsx", 'import { ProductDetailIntegrated as ProductDetail } from "@/components/storefront/product-detail-integrated";', 'import { ProductDetailV2 as ProductDetail } from "@/components/storefront/product-detail-v2";');
await replace("src/app/(storefront)/products/[slug]/page.tsx", 'from "@/lib/storefront/adapters-integrated"', 'from "@/lib/storefront/adapters-api"');
await replace("src/app/(storefront)/cart/page.tsx", 'import { CartClientIntegrated as CartClient } from "@/components/storefront/cart-client-integrated";', 'import { CartClientV2 as CartClient } from "@/components/storefront/cart-client-v2";');
await replace("src/app/(storefront)/checkout/page.tsx", 'import { CheckoutClientIntegrated as CheckoutClient } from "@/components/storefront/checkout-client-integrated";', 'import { CheckoutClientV2 as CheckoutClient } from "@/components/storefront/checkout-client-v2";');

await replace("src/lib/storefront/types.ts", 'sizes: { name: string; stock: number }[];', 'sizes: { name: string; stock: number; variantId?: string }[];');

await replace("src/components/storefront/product-detail-v2.tsx", 'const variants: Record<string, Record<string, string>> = {\n  prd_01: { M: "var_dress_m_beige", L: "var_dress_l_beige" },\n  prd_03: { "0–3M": "var_baby_03_cream" },\n};\n\n', '');
await replace("src/components/storefront/product-detail-v2.tsx", 'const variantId = variants[product.id]?.[size];', 'const variantId = product.sizes.find((item) => item.name === size)?.variantId;');

const wishlistPage = `import { WishlistClient } from "@/components/storefront/wishlist-client";\nexport default function WishlistPage() { return <section><h2 className="font-serif text-3xl">Sản phẩm yêu thích</h2><p className="mt-2 text-sm text-[#6d625d]">Những điều mẹ đã lưu để xem lại sau.</p><WishlistClient/></section>; }\n`;
await writeFile("src/app/(storefront)/account/wishlist/page.tsx", wishlistPage, "utf8");

const runtimeFile = "src/lib/server/runtime.ts";
let runtime = await readFile(runtimeFile, "utf8");
runtime = runtime
  .replace('imageUrl: "/images/products/dam-bau-linen.jpg"', 'imageUrl: "https://images.unsplash.com/photo-1596783074918-c84cb06531ca?auto=format&fit=crop&w=900&q=80"')
  .replace('imageUrl: "/images/products/bo-so-sinh.jpg"', 'imageUrl: "https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=900&q=80"');
await writeFile(runtimeFile, runtime, "utf8");

console.log("Integrated API-first storefront, accessible shell, wishlist, cart and checkout UX.");

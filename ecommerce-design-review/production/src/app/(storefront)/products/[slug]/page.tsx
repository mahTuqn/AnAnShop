import { notFound } from "next/navigation";
import { ProductDetailV2 as ProductDetail } from "@/components/storefront/product-detail-v2";
import { ProductCard } from "@/components/storefront/product-card-v2";
import { ProductReviews } from "@/components/storefront/product-reviews";
import { getCatalog, getProduct } from "@/lib/storefront/adapters-api";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const product = await getProduct(slug); if (!product) notFound(); const related = (await getCatalog({ category: product.category })).filter((item) => item.id !== product.id).slice(0, 4);
  return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6"><nav className="mb-8 text-sm text-[#776b65]" aria-label="Đường dẫn">Trang chủ / {product.categoryLabel} / <span className="text-[#3b2f2f]">{product.name}</span></nav><ProductDetail product={product}/><ProductReviews productId={product.id}/><section className="mt-24"><h2 className="font-serif text-3xl">Có thể mẹ cũng thích</h2><div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">{related.map((item) => <ProductCard product={item} key={item.id}/>)}</div></section></main>;
}

export const dynamic = "force-dynamic";

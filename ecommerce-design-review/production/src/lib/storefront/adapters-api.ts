import { runtime } from "@/lib/server/runtime-selected";
import type { ProductSummary } from "@/modules/catalog";
import { categoryLabels, products as displayProducts } from "./data";
import type { Category, Product } from "./types";

export type CatalogQuery = { q?: string; category?: string; brand?: string; size?: string; minPrice?: string; maxPrice?: string; minRating?: string; sort?: string; page?: string };

const categoryAliases: Record<string, Category> = {
  maternity: "maternity", "do-bau": "maternity",
  postpartum: "postpartum", "sau-sinh": "postpartum", "cho-bu": "postpartum", "sau-sinh-cho-bu": "postpartum",
  newborn: "newborn", "do-so-sinh": "newborn", accessories: "accessories", "phu-kien": "accessories",
  gift: "gift", "qua-tang": "gift", combo: "gift", "combo-qua-tang": "gift",
};

function sizeLabel(name: string): string {
  const value = name.split("/").at(-1)?.trim() || name;
  return value.replace(/\s*tháng$/iu, "M").replace(/\s+/g, " ");
}

function toProduct(source: ProductSummary): Product {
  const displayAliases: Record<string, string> = { "dam-bau-linen-an-nhien": "prd_01", "bo-body-so-sinh-may-nho": "prd_03", "ao-cho-bu-modal-diu-em": "prd_02" };
  const display = displayProducts.find((item) => item.slug === source.slug || item.id === source.id || item.id === displayAliases[source.slug]);
  const category = categoryAliases[source.categorySlug] ?? display?.category ?? "maternity";
  const active = source.variants.filter((variant) => variant.active);
  const lowest = [...active].sort((a, b) => a.price - b.price)[0];
  const sizeMap = new Map<string, { name: string; variantId?: string }>();
  for (const variant of active) {
    const name = sizeLabel(variant.name); const existing = sizeMap.get(name);
    if (!existing) sizeMap.set(name, { name, variantId: variant.id });
  }
  const fallbackImage = source.imageUrl || display?.image || "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1100&q=85";
  return {
    id: source.id, slug: source.slug, name: source.name, category, categoryLabel: categoryLabels[category],
    price: lowest?.price ?? display?.price ?? 0, compareAtPrice: lowest?.compareAtPrice ?? display?.compareAtPrice,
    image: fallbackImage, images: source.images?.length ? source.images : (display?.images?.length ? display.images : [fallbackImage]), badge: display?.badge,
    colors: display?.colors?.length ? display.colors : [{ name: "Mặc định", hex: "#d7c8b9" }],
    sizes: sizeMap.size ? [...sizeMap.values()] : [], material: display?.material ?? "Đang cập nhật",
    stage: display?.stage ?? "Mẹ và bé", rating: display?.rating ?? 0, reviewCount: display?.reviewCount ?? 0,
    description: display?.description ?? "Thông tin chi tiết sản phẩm đang được An An cập nhật.", brand: "An An",
  };
}

export async function getCatalog(query: CatalogQuery = {}): Promise<Product[]> {
  const page = await runtime.catalog.list({ page: 1, pageSize: 100 });
  let result = page.items.map(toProduct);
  const needle = query.q?.trim().toLocaleLowerCase("vi");
  if (needle) result = result.filter((product) => [product.name, product.description, product.material, product.stage, product.categoryLabel].some((value) => value.toLocaleLowerCase("vi").includes(needle)));
  if (query.category && query.category !== "all") result = result.filter((product) => product.category === query.category);
  if (query.brand) result = result.filter((product) => product.brand?.toLocaleLowerCase("vi") === query.brand?.toLocaleLowerCase("vi"));
  if (query.size) result = result.filter((product) => product.sizes.some((size) => size.name === query.size));
  const min = Number(query.minPrice); const max = Number(query.maxPrice); const rating = Number(query.minRating);
  if (Number.isFinite(min) && min > 0) result = result.filter((product) => product.price >= min);
  if (Number.isFinite(max) && max > 0) result = result.filter((product) => product.price <= max);
  if (Number.isFinite(rating) && rating > 0) result = result.filter((product) => product.rating >= rating);
  if (query.sort === "price-asc") result.sort((a, b) => a.price - b.price);
  else if (query.sort === "price-desc") result.sort((a, b) => b.price - a.price);
  else if (query.sort === "rating") result.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
  else if (query.sort === "bestseller") result.sort((a, b) => b.reviewCount - a.reviewCount);
  else if (query.sort === "newest") result.sort((a, b) => Number(Boolean(b.badge?.toLocaleLowerCase("vi").includes("mới"))) - Number(Boolean(a.badge?.toLocaleLowerCase("vi").includes("mới"))));
  return result;
}

export async function getProduct(slug: string): Promise<Product | null> {
  const result = await runtime.catalog.detail(slug);
  return result.ok ? toProduct(result.value) : null;
}

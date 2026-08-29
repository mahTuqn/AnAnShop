import Link from "next/link";
import { CatalogFilters } from "@/components/storefront/catalog-filters";
import { ProductCard } from "@/components/storefront/product-card-v2";
import { EmptyState } from "@/components/ui/states";
import { getCatalog, type CatalogQuery } from "@/lib/storefront/adapters-api";

export const metadata = { title: "Sản phẩm" };
const PAGE_SIZE = 12;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<CatalogQuery> }) {
  const query = await searchParams; const all = await getCatalog(query);
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const requested = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1); const page = Math.min(requested, totalPages);
  const list = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const href = (next: number) => { const params = new URLSearchParams(); for (const [key, value] of Object.entries(query)) if (key !== "page" && value) params.set(key, value); params.set("page", String(next)); return `/products?${params}`; };
  return <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-semibold tracking-[.2em] text-[#8a493d]">BỘ SƯU TẬP</p><h1 className="mt-2 font-serif text-4xl">{query.q ? `Kết quả cho “${query.q}”` : "Tất cả sản phẩm"}</h1><p className="mt-2 text-[#6d625d]">Tìm theo danh mục, giá, đánh giá và kích thước.</p></div><form>{Object.entries(query).filter(([key, value]) => !["sort", "page"].includes(key) && value).map(([key, value]) => <input type="hidden" name={key} value={value} key={key} />)}<select name="sort" defaultValue={query.sort ?? "popular"} className="rounded-xl border border-[#d9d0cb] bg-white px-4 py-3" aria-label="Sắp xếp sản phẩm"><option value="popular">Phổ biến</option><option value="newest">Mới nhất</option><option value="bestseller">Bán chạy</option><option value="rating">Đánh giá cao</option><option value="price-asc">Giá tăng dần</option><option value="price-desc">Giá giảm dần</option></select><button className="ml-2 rounded-xl border border-[#713c33] px-4 py-3 text-sm">Áp dụng</button></form></div>
    <div className="mt-10 grid gap-8 lg:grid-cols-[240px_1fr]"><CatalogFilters /><section aria-live="polite"><p className="mb-5 text-sm text-[#776b65]">{all.length} sản phẩm phù hợp · Trang {page}/{totalPages}</p>{list.length ? <><div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3">{list.map((product) => <ProductCard product={product} key={product.id} />)}</div>{totalPages > 1 && <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Phân trang">{page > 1 && <Link className="rounded-xl border px-4 py-2" href={href(page - 1)}>Trang trước</Link>}<span className="text-sm">Trang {page} / {totalPages}</span>{page < totalPages && <Link className="rounded-xl border px-4 py-2" href={href(page + 1)}>Trang sau</Link>}</nav>}</> : <EmptyState title="Chưa tìm thấy sản phẩm" description="Mẹ thử từ khóa hoặc bộ lọc khác nhé." actionHref="/products" action="Xóa bộ lọc" />}</section></div>
  </main>;
}

export const dynamic = "force-dynamic";

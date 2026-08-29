"use client";
import { useRouter, useSearchParams } from "next/navigation";

const categories = [["all", "Tất cả"], ["maternity", "Đồ bầu"], ["postpartum", "Sau sinh & cho bú"], ["newborn", "Đồ sơ sinh"], ["accessories", "Phụ kiện"], ["gift", "Combo quà tặng"]];
const sizes = ["S", "M", "L", "XL", "0–3M", "3–6M"];

export function CatalogFilters() {
  const router = useRouter(); const current = useSearchParams();
  const set = (key: string, value: string) => { const params = new URLSearchParams(current.toString()); value ? params.set(key, value) : params.delete(key); params.delete("page"); router.push(`/products?${params.toString()}`); };
  return <aside className="rounded-2xl border border-[#e6ddd8] bg-white p-5 lg:sticky lg:top-24 lg:self-start" aria-label="Bộ lọc sản phẩm">
    <div><label className="text-sm font-semibold" htmlFor="search">Tìm sản phẩm</label><input id="search" defaultValue={current.get("q") ?? ""} onKeyDown={(event) => { if (event.key === "Enter") set("q", event.currentTarget.value); }} className="mt-2 w-full rounded-xl border border-[#d9d0cb] px-4 py-3" placeholder="Tên, chất liệu..." /></div>
    <fieldset className="mt-6"><legend className="font-semibold">Danh mục</legend><div className="mt-3 space-y-2">{categories.map(([key, label]) => <label className="flex cursor-pointer items-center gap-3 text-sm" key={key}><input type="radio" name="category" checked={(current.get("category") ?? "all") === key} onChange={() => set("category", key === "all" ? "" : key)} />{label}</label>)}</div></fieldset>
    <fieldset className="mt-6"><legend className="font-semibold">Khoảng giá</legend><div className="mt-3 grid grid-cols-2 gap-2"><input aria-label="Giá từ" type="number" min="0" step="50000" defaultValue={current.get("minPrice") ?? ""} onBlur={(event) => set("minPrice", event.currentTarget.value)} className="min-w-0 rounded-lg border px-3 py-2 text-sm" placeholder="Từ" /><input aria-label="Giá đến" type="number" min="0" step="50000" defaultValue={current.get("maxPrice") ?? ""} onBlur={(event) => set("maxPrice", event.currentTarget.value)} className="min-w-0 rounded-lg border px-3 py-2 text-sm" placeholder="Đến" /></div></fieldset>
    <label className="mt-6 block font-semibold">Đánh giá tối thiểu<select className="mt-2 w-full rounded-xl border px-3 py-2 text-sm" value={current.get("minRating") ?? ""} onChange={(event) => set("minRating", event.target.value)}><option value="">Tất cả</option><option value="4">4★ trở lên</option><option value="4.5">4.5★ trở lên</option></select></label>
    <fieldset className="mt-6"><legend className="font-semibold">Kích thước</legend><div className="mt-3 flex flex-wrap gap-2">{sizes.map((size) => <button type="button" className={`min-h-10 rounded-lg border px-3 text-sm ${current.get("size") === size ? "border-[#713c33] bg-[#f7eeea]" : "border-[#d9d0cb]"}`} onClick={() => set("size", current.get("size") === size ? "" : size)} key={size}>{size}</button>)}</div></fieldset>
    <button className="mt-6 text-sm text-[#713c33] underline" onClick={() => router.push("/products")}>Xóa bộ lọc</button>
  </aside>;
}

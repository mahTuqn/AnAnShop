"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiRequest, type ApiCart } from "@/lib/storefront/api";
import { money } from "@/lib/storefront/data";
import type { Product } from "@/lib/storefront/types";

export function ProductDetailV2({ product }: { product: Product }) {
  const router = useRouter();
  const [image, setImage] = useState(0);
  const [size, setSize] = useState("");
  const [color, setColor] = useState(product.colors[0]?.name ?? "");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<"cart" | "buy" | null>(null);

  const add = async (destination: "cart" | "buy") => {
    if (!size) { setError("Mẹ vui lòng chọn kích thước trước khi thêm vào giỏ."); document.getElementById("chon-size")?.scrollIntoView({ behavior: "smooth" }); return; }
    const variantId = product.sizes.find((item) => item.name === size)?.variantId;
    if (!variantId) { setError("Biến thể này đang được cập nhật trên hệ thống. Mẹ vui lòng chọn size còn bán hoặc liên hệ An An."); return; }
    setPending(destination); setError(""); setMessage("");
    if (destination === "buy") {
      router.push(`/checkout?buyNow=${variantId}&qty=${quantity}`);
      return;
    }
    try { await apiRequest<ApiCart>("/api/cart", { method: "POST", body: JSON.stringify({ variantId, quantity }) }); setMessage("Đã thêm sản phẩm vào giỏ hàng."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể thêm sản phẩm."); }
    finally { setPending(null); }
  };

  const nextImage = () => setImage((prev) => (prev + 1) % product.images.length);
  const prevImage = () => setImage((prev) => (prev - 1 + product.images.length) % product.images.length);

  return <div className="grid gap-10 lg:grid-cols-[1.1fr_.9fr]" data-testid="product-detail"><section aria-label="Ảnh sản phẩm"><div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-[#eee6e1]"><img className="size-full object-cover" src={product.images[image] ?? product.image} alt={`${product.name}${image ? ` – ảnh ${image + 1}` : ""}`}/>{product.images.length > 1 && <><button type="button" onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-white/80 text-black shadow-sm hover:bg-white transition-colors" aria-label="Ảnh trước">❮</button><button type="button" onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-white/80 text-black shadow-sm hover:bg-white transition-colors" aria-label="Ảnh tiếp theo">❯</button></>}</div>{product.images.length > 1 && <div className="mt-3 flex gap-3" role="group" aria-label="Chọn ảnh sản phẩm">{product.images.map((src, index) => <button type="button" className={`size-20 overflow-hidden rounded-xl border-2 ${image === index ? "border-[#713c33]" : "border-transparent"}`} onClick={() => setImage(index)} aria-label={`Xem ảnh ${index + 1}`} aria-pressed={image === index} key={src}><img className="size-full object-cover" src={src} alt=""/></button>)}</div>}</section>
    <section className="lg:sticky lg:top-24 lg:self-start"><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#8a493d]">{product.categoryLabel}</p><h1 className="mt-3 font-serif text-4xl leading-tight">{product.name}</h1><p className="mt-4 text-sm text-[#625853]" aria-label={`${product.rating} trên 5 sao, ${product.reviewCount} đánh giá`}><span aria-hidden>★</span> {product.rating} · {product.reviewCount} đánh giá</p><div className="mt-5 flex gap-3 text-xl"><strong>{money(product.price)}</strong>{product.compareAtPrice && <del className="text-base text-[#766c67]">{money(product.compareAtPrice)}</del>}</div><p className="mt-6 leading-7 text-[#5f5550]">{product.description}</p>
      <fieldset className="mt-8"><legend className="font-semibold">Màu sắc · <span className="font-normal">{color}</span></legend><div className="mt-3 flex gap-3">{product.colors.map((item) => <button type="button" className={`size-11 rounded-full border-4 ${color === item.name ? "ring-2 ring-[#713c33] ring-offset-2" : ""}`} style={{ background: item.hex }} onClick={() => setColor(item.name)} aria-label={`Màu ${item.name}`} aria-pressed={color === item.name} key={item.name}/>)}</div></fieldset>
      <fieldset className="mt-8" id="chon-size"><legend className="font-semibold">Kích thước</legend><div className="mt-3 grid grid-cols-4 gap-2">{product.sizes.map((item) => <button type="button" className={`min-h-13 rounded-xl border text-sm ${size === item.name ? "border-[#713c33] bg-[#f7eeea]" : "border-[#cbbfba]"}`} onClick={() => { setSize(item.name); setError(""); }} aria-pressed={size === item.name} data-testid={`size-${item.name}`} key={item.name}>{item.name}</button>)}</div></fieldset>
      <fieldset className="mt-8"><legend className="font-semibold">Số lượng</legend>
        <div className="mt-3 flex h-13 w-32 items-center rounded-xl border border-[#cbbfba] bg-white">
          <button type="button" className="flex h-full w-10 items-center justify-center text-xl text-[#713c33] hover:bg-[#f7eeea] rounded-l-xl transition-colors" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Giảm số lượng">-</button>
          <input type="number" min="1" max="99" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="h-full flex-1 text-center font-medium border-none p-0 focus:ring-0" aria-label="Số lượng" />
          <button type="button" className="flex h-full w-10 items-center justify-center text-xl text-[#713c33] hover:bg-[#f7eeea] rounded-r-xl transition-colors" onClick={() => setQuantity(quantity + 1)} aria-label="Tăng số lượng">+</button>
        </div>
      </fieldset>

      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}{message && <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800" role="status">{message} <a className="font-semibold underline" href="/cart">Xem giỏ hàng</a></p>}
      <div className="mt-7 grid gap-3 sm:grid-cols-2"><Button disabled={pending !== null} data-testid="add-to-cart" variant="secondary" onClick={() => add("cart")}>{pending === "cart" ? "Đang thêm…" : "Thêm vào giỏ"}</Button><Button disabled={pending !== null} className="w-full" onClick={() => add("buy")}>{pending === "buy" ? "Đang chuẩn bị…" : "Mua ngay"}</Button></div><ul className="mt-7 grid gap-3 border-y border-[#e2d8d3] py-5 text-sm text-[#5f5550]"><li>✓ Giao hàng dự kiến trong 2–4 ngày</li><li>✓ Miễn phí vận chuyển từ 699.000đ</li><li>✓ Hỗ trợ đổi size trong 14 ngày</li></ul></section></div>;
}

"use client";

import { useEffect, useState } from "react";
import { ProductCard, readWishlist } from "./product-card-v2";
import type { Product } from "@/lib/storefront/types";
import { EmptyState } from "@/components/ui/states";
import { apiRequest } from "@/lib/storefront/api";

export function WishlistClient({ products }: { products: Product[] }) {
  const [ids, setIds] = useState<string[] | null>(null); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [pending, setPending] = useState("");
  useEffect(() => { const update = () => setIds(readWishlist()); update(); window.addEventListener("anan:wishlist", update); return () => window.removeEventListener("anan:wishlist", update); }, []);
  if (ids === null) return <p role="status" className="mt-7 text-sm text-[#6d625d]">Đang tải danh sách yêu thích…</p>;
  const saved = products.filter((product) => ids.includes(product.id));
  const move = async (product: Product) => {
    const variant = product.sizes.find((size) => size.variantId);
    if (!variant?.variantId) { setError("Sản phẩm chưa có phiên bản còn hàng để thêm vào giỏ."); return; }
    setPending(product.id); setError(""); setMessage("");
    try {
      await apiRequest("/api/cart", { method: "POST", body: JSON.stringify({ variantId: variant.variantId, quantity: 1 }) });
      const next = readWishlist().filter((id) => id !== product.id); localStorage.setItem("anan_wishlist", JSON.stringify(next)); setIds(next); window.dispatchEvent(new Event("anan:wishlist")); setMessage(`Đã chuyển ${product.name} vào giỏ hàng.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể chuyển vào giỏ hàng."); }
    finally { setPending(""); }
  };
  if (!saved.length) return <div className="mt-7">{message && <p className="mb-4 rounded-xl bg-green-50 p-4 text-sm text-green-800" role="status">{message}</p>}<EmptyState title="Chưa có sản phẩm yêu thích" description="Chạm vào biểu tượng trái tim trên sản phẩm để lưu lại cho lần sau." actionHref="/products" action="Khám phá sản phẩm" /></div>;
  return <><div className="mt-5">{error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">{error}</p>}{message && <p className="rounded-xl bg-green-50 p-4 text-sm text-green-800" role="status">{message}</p>}</div><div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3">{saved.map((product) => <div key={product.id}><ProductCard product={product} /><button className="mt-3 w-full rounded-xl border border-[#713c33] px-4 py-2 text-sm font-semibold text-[#713c33] disabled:opacity-50" disabled={pending === product.id} onClick={() => void move(product)}>{pending === product.id ? "Đang chuyển…" : "Chuyển vào giỏ"}</button></div>)}</div></>;
}

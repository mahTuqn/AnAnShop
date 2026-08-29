"use client";
import { useEffect, useState } from "react";
import type { Product } from "@/lib/storefront/types";
import { ProductCard } from "./product-card-v2";

export function RecentlyViewed({ products }: { products: Product[] }) {
  const [recent, setRecent] = useState<Product[]>([]);
  useEffect(() => {
    try { const ids = JSON.parse(localStorage.getItem("anan_recent_products") ?? "[]") as string[]; setRecent(ids.map((id) => products.find((product) => product.id === id)).filter((item): item is Product => Boolean(item)).slice(0, 4)); } catch { setRecent([]); }
  }, [products]);
  if (!recent.length) return null;
  return <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6"><h2 className="font-serif text-3xl">Sản phẩm đã xem gần đây</h2><div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">{recent.map((product) => <ProductCard product={product} key={product.id} />)}</div></section>;
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { money } from "@/lib/storefront/data";
import type { Product } from "@/lib/storefront/types";

const wishlistKey = "anan_wishlist";

export function readWishlist(): string[] {
  if (typeof window === "undefined") return [];
  try { const value = JSON.parse(localStorage.getItem(wishlistKey) ?? "[]"); return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : []; }
  catch { return []; }
}

export function ProductCard({ product }: { product: Product }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => { setSaved(readWishlist().includes(product.id)); }, [product.id]);
  const toggle = () => {
    const current = new Set(readWishlist());
    if (current.has(product.id)) current.delete(product.id); else current.add(product.id);
    localStorage.setItem(wishlistKey, JSON.stringify([...current]));
    setSaved(current.has(product.id));
    window.dispatchEvent(new Event("anan:wishlist"));
  };

  return <article className="group relative"><Link href={`/products/${product.slug}`} className="block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c26b77]"><span className="relative block aspect-[4/5] overflow-hidden rounded-3xl bg-[#faeff1]"><Image fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" src={product.image} alt={product.name}/>{product.badge && <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#ce7a85]">{product.badge}</span>}</span><span className="mt-4 block"><span className="text-xs uppercase tracking-[.16em] text-[#8a7d77]">{product.categoryLabel}</span><span className="mt-1 block min-h-12 font-medium leading-6">{product.name}</span><span className="mt-1 flex flex-wrap gap-2"><strong>{money(product.price)}</strong>{product.compareAtPrice && <del className="text-sm text-[#766c67]">{money(product.compareAtPrice)}</del>}</span><span className="mt-2 block text-sm text-[#625853]" aria-label={`${product.rating} trên 5 sao, ${product.reviewCount} đánh giá`}><span aria-hidden>★</span> {product.rating} ({product.reviewCount})</span></span></Link><button type="button" className="absolute right-3 top-3 grid size-11 place-items-center rounded-full bg-white/95 text-xl shadow-sm hover:text-[#9a4e58]" aria-label={`${saved ? "Xóa" : "Thêm"} ${product.name} ${saved ? "khỏi" : "vào"} yêu thích`} aria-pressed={saved} onClick={toggle}><span aria-hidden>{saved ? "♥" : "♡"}</span></button></article>;
}

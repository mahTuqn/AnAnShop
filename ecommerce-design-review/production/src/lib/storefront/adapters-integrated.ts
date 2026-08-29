import { findProduct, orders, products } from "./data";
import type { Category } from "./types";
export type CatalogQuery = { q?: string; category?: string; size?: string; sort?: string };
export async function getCatalog(query: CatalogQuery = {}) { const normalized = query.q?.trim().toLocaleLowerCase("vi") ?? ""; let result = products.filter((product) => (!normalized || `${product.name} ${product.material} ${product.categoryLabel}`.toLocaleLowerCase("vi").includes(normalized)) && (!query.category || query.category === "all" || product.category === query.category as Category) && (!query.size || product.sizes.some((size) => size.name === query.size))); if (query.sort === "price-asc") result = [...result].sort((a, b) => a.price - b.price); if (query.sort === "price-desc") result = [...result].sort((a, b) => b.price - a.price); return result; }
export async function getProduct(slug: string) { return findProduct(slug) ?? null; }
export async function getOrders() { return orders; }
export async function getOrder(code: string) { return orders.find((order) => order.code === code) ?? (code.startsWith("AN") ? { code, date: "28/08/2026", status: "processing" as const, total: 579000, items: [{ productId: "prd_01", quantity: 1, size: "M", color: "Be tự nhiên" }] } : null); }

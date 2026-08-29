import { readFileSync, writeFileSync } from "node:fs";

const path = "src/lib/server/runtime.ts";
let source = readFileSync(path, "utf8");
const start = source.indexOf("function demoProducts(): ProductSummary[] {");
const end = source.indexOf("\n\nconst store = new MemoryStore();", start);
if (start < 0 || end < 0) throw new Error("demoProducts block not found");
const replacement = `function demoProducts(): ProductSummary[] {
  return [
    { id: "50000000-0000-0000-0000-000000000001", slug: "dam-bau-linen-an-nhien", name: "Đầm bầu linen An Nhiên", categorySlug: "do-bau", imageUrl: "https://images.unsplash.com/photo-1596783074918-c84cb06531ca?auto=format&fit=crop&w=900&q=80", featured: true, variants: [
      { id: "52000000-0000-0000-0000-000000000001", sku: "AN-NHIEN-M", name: "M", price: vnd(689_000), compareAtPrice: vnd(759_000), available: 24, active: true },
      { id: "52000000-0000-0000-0000-000000000002", sku: "AN-NHIEN-L", name: "L", price: vnd(689_000), compareAtPrice: vnd(759_000), available: 18, active: true },
    ] },
    { id: "50000000-0000-0000-0000-000000000002", slug: "bo-body-so-sinh-may-nho", name: "Bộ body sơ sinh Mây Nhỏ", categorySlug: "do-so-sinh", imageUrl: "https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=900&q=80", featured: true, variants: [
      { id: "52000000-0000-0000-0000-000000000003", sku: "MAY-NHO-0-3M", name: "0–3M", price: vnd(289_000), available: 36, active: true },
      { id: "52000000-0000-0000-0000-000000000004", sku: "MAY-NHO-3-6M", name: "3–6M", price: vnd(289_000), available: 28, active: true },
    ] },
    { id: "50000000-0000-0000-0000-000000000003", slug: "ao-cho-bu-modal-diu-em", name: "Áo cho bú Modal Dịu Êm", categorySlug: "sau-sinh", imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=80", featured: false, variants: [
      { id: "52000000-0000-0000-0000-000000000005", sku: "DIU-EM-M", name: "M", price: vnd(429_000), compareAtPrice: vnd(479_000), available: 16, active: true },
    ] },
  ];
}`;
source = source.slice(0, start) + replacement + source.slice(end);
writeFileSync(path, source, "utf8");

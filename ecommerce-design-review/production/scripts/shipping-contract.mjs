import { readFileSync, writeFileSync } from "node:fs";

function replace(path, before, after) {
  const source = readFileSync(path, "utf8");
  if (!source.includes(before)) throw new Error(`Expected source not found: ${path}`);
  writeFileSync(path, source.replace(before, after), "utf8");
}

replace("src/modules/checkout/index.ts", `const shippingFor = (subtotal: Vnd, discount: Discount | null): Vnd => discount?.freeShipping || subtotal >= 500_000 ? vnd(0) : vnd(30_000);`, `export const FREE_SHIPPING_THRESHOLD = 699_000;\nexport const STANDARD_SHIPPING_FEE = 30_000;\nexport const shippingFor = (subtotal: Vnd, discount: Discount | null): Vnd => discount?.freeShipping || subtotal >= FREE_SHIPPING_THRESHOLD ? vnd(0) : vnd(STANDARD_SHIPPING_FEE);`);
replace("src/lib/server/persistent-store.ts", `freeShipping || lockedSubtotal >= 500_000 ? 0 : 30_000`, `freeShipping || lockedSubtotal >= 699_000 ? 0 : 30_000`);

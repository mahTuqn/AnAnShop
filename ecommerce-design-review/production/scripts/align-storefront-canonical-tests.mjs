import { readFile, writeFile } from "node:fs/promises";

const adapterFile = "src/lib/storefront/adapters-api.ts";
let adapter = await readFile(adapterFile, "utf8");
adapter = adapter.replace(
  'const display = displayProducts.find((item) => item.slug === source.slug || item.id === source.id);',
  'const displayAliases: Record<string, string> = { "dam-bau-linen-an-nhien": "prd_01", "bo-body-so-sinh-may-nho": "prd_03", "ao-cho-bu-modal-diu-em": "prd_02" };\n  const display = displayProducts.find((item) => item.slug === source.slug || item.id === source.id || item.id === displayAliases[source.slug]);'
);
await writeFile(adapterFile, adapter, "utf8");

for (const file of ["tests/e2e/storefront-guest-order-lookup.spec.ts", "tests/e2e/storefront-p0.spec.ts"]) {
  const source = await readFile(file, "utf8");
  await writeFile(file, source.replaceAll('var_dress_m_beige', '52000000-0000-0000-0000-000000000001'), "utf8");
}
const integrated = "tests/e2e/storefront-integrated.spec.ts";
let source = await readFile(integrated, "utf8");
source = source.replaceAll('/products/dam-bau-linen-that-no', '/products/dam-bau-linen-an-nhien');
await writeFile(integrated, source, "utf8");
console.log("Canonical product aliases and acceptance fixtures aligned.");

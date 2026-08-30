import { readFile, writeFile } from "node:fs/promises";
for (const file of ["src/app/(storefront)/page.tsx", "src/app/(storefront)/products/page.tsx", "src/app/(storefront)/products/[slug]/page.tsx"]) {
  const source = await readFile(file, "utf8");
  if (!source.includes("export const dynamic")) await writeFile(file, `${source.trimEnd()}\n\nexport const dynamic = "force-dynamic";\n`, "utf8");
}
console.log("Catalog-backed pages marked force-dynamic.");

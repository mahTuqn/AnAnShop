import { readFile, writeFile } from "node:fs/promises";
const file = "src/app/(storefront)/products/[slug]/page.tsx";
let source = await readFile(file, "utf8");
source = source.replace('import { getProduct } from "@/lib/storefront/adapters-api";\nimport { products } from "@/lib/storefront/data";', 'import { getCatalog, getProduct } from "@/lib/storefront/adapters-api";');
source = source.replace('const { slug } = await params; const product = await getProduct(slug); if (!product) notFound();', 'const { slug } = await params; const product = await getProduct(slug); if (!product) notFound(); const related = (await getCatalog({ category: product.category })).filter((item) => item.id !== product.id).slice(0, 4);');
source = source.replace('products.filter((item) => item.id !== product.id).slice(0, 4).map((item)', 'related.map((item)');
await writeFile(file, source, "utf8");
console.log("Related products now use canonical catalog.");

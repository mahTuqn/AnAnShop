import { readFile, writeFile } from "node:fs/promises";

const detailFile = "src/app/(storefront)/products/[slug]/page.tsx";
let detail = await readFile(detailFile, "utf8");
detail = detail.replace('import { getProduct } from "@/lib/storefront/adapters-api";\nimport { products } from "@/lib/storefront/data";', 'import { getCatalog, getProduct } from "@/lib/storefront/adapters-api";');
detail = detail.replace('const { slug } = await params; const product = await getProduct(slug); if (!product) notFound();', 'const { slug } = await params; const product = await getProduct(slug); if (!product) notFound(); const related = (await getCatalog({ category: product.category })).filter((item) => item.id !== product.id).slice(0, 4);');
detail = detail.replace('products.filter((item) => item.id !== product.id).slice(0, 4).map((item)', 'related.map((item)');
await writeFile(detailFile, detail, "utf8");

const homeFile = "src/app/(storefront)/page.tsx";
let home = await readFile(homeFile, "utf8");
home = home.replace('import { products } from "@/lib/storefront/data";', 'import { products as displayProducts } from "@/lib/storefront/data";\nimport { getCatalog } from "@/lib/storefront/adapters-api";');
home = home.replace('export default function HomePage() {', 'export default async function HomePage() { const products = await getCatalog();');
home = home.replaceAll('products[0].image', 'displayProducts[0].image').replaceAll('products[1].image', 'displayProducts[1].image').replaceAll('products[2].image', 'displayProducts[2].image');
await writeFile(homeFile, home, "utf8");

console.log("Home and related product cards now use canonical catalog.");

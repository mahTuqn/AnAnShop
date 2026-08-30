import { ProductEditor } from "@/components/admin/product-editor";
import { requireAdminPageSession } from "@/lib/admin/page-guard";
import { getPrisma } from "@/lib/server/prisma";

export default async function NewProductPage() {
  await requireAdminPageSession("/admin/products", "products.write");
  const db = getPrisma();
  const categories = await db.category.findMany({ select: { id: true, name: true } });
  return <ProductEditor productId="new" categories={categories} />;
}

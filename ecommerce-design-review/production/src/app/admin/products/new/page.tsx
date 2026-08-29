import { ProductEditor } from "@/components/admin/product-editor";
import { requireAdminPageSession } from "@/lib/admin/page-guard";

export default async function NewProductPage() {
  await requireAdminPageSession("/admin/products", "products.write");
  return <ProductEditor productId="new" />;
}

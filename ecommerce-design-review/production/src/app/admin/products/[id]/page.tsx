import { ProductEditor } from "@/components/admin/product-editor";
import { requireAdminPageSession } from "@/lib/admin/page-guard";
import { getPrisma } from "@/lib/server/prisma";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPageSession("/admin/products", "products.write");
  const { id } = await params;
  
  const db = getPrisma();
  let initialData = null;
  if (id !== "new") {
    const product = await db.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { position: "asc" } },
        variants: true
      }
    });
    if (product) {
      initialData = {
        ...product,
        images: product.images.map(img => img.url),
        variants: product.variants.map(v => ({
          sku: v.sku,
          price: Number(v.price).toString(),
          active: v.active,
          size: v.sku.split('-').pop() || '',
          color: 'Mặc định'
        }))
      };
    }
  }

  const categories = await db.category.findMany({ select: { id: true, name: true } });
  return <ProductEditor productId={id} initialData={initialData} categories={categories} />;
}

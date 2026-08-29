import { requireAdminPageSession } from "@/lib/admin/page-guard";
import { AdminResourcePageV3 as AdminResourcePage } from "@/components/admin/resource-page-v3";
import { getPrisma } from "@/lib/server/prisma";

export default async function Page() {
  await requireAdminPageSession("/admin/products", "products.read");
  
  const db = getPrisma();
  const products = await db.product.findMany({
    where: { deletedAt: null },
    include: {
      category: true,
      variants: true
    },
    orderBy: { createdAt: "desc" }
  });

  const resource = {
    title: "Sản phẩm & biến thể",
    description: "Quản lý nội dung, ảnh, giá, SKU và trạng thái bán.",
    createLabel: "Thêm sản phẩm",
    headers: ["Sản phẩm", "Danh mục", "SKU đại diện", "Giá"],
    statuses: ["ACTIVE", "DRAFT", "ARCHIVED"],
    rows: products.map(p => {
      const firstVariant = p.variants[0];
      return {
        id: p.id,
        cells: [
          p.name,
          p.category.name,
          firstVariant?.sku ?? "N/A",
          firstVariant ? `${Number(firstVariant.price).toLocaleString()} ₫` : "N/A",
        ],
        status: p.status,
        detail: [
          ["Biến thể", `${p.variants.length} biến thể`],
          ["Slug", p.slug]
        ] as Array<[string, string]>
      };
    })
  };

  return <AdminResourcePage resource={resource} resourceKey="products" />;
}

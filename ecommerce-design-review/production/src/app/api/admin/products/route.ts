import { NextRequest } from "next/server";
import { adminRoute, pageParams } from "@/lib/server/admin";
import { object, stringField } from "@/modules/shared";

export const GET = (request: NextRequest) => adminRoute(request, "products.read", async ({ db }) => {
  const { page, pageSize, skip } = pageParams(request);
  const q = request.nextUrl.searchParams.get("q") ?? undefined;
  const where = { deletedAt: null, ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}) };
  const [items, total] = await db.$transaction([db.product.findMany({ where, include: { category: true, variants: true }, orderBy: { createdAt: "desc" }, skip, take: pageSize }), db.product.count({ where })]);
  return { data: { items, meta: { page, pageSize, total } } };
});

export const POST = (request: NextRequest) => adminRoute(request, "products.write", async ({ db }) => {
  const body = object(await request.json());
  
  // Basic info
  let categoryId = stringField(body, "categoryId", { optional: true, max: 50 });
  if (!categoryId) {
    const defaultCat = await db.category.findFirst();
    categoryId = defaultCat?.id;
  }
  
  const status = stringField(body, "status", { optional: true, max: 20 }) || "DRAFT";
  
  const product = await db.product.create({ 
    data: { 
      categoryId: categoryId as string, 
      name: stringField(body, "name", { max: 200 })!, 
      slug: stringField(body, "slug", { max: 220 })!, 
      shortDescription: stringField(body, "shortDescription", { optional: true, max: 500 }), 
      status: status as any,
      publishedAt: status === "ACTIVE" ? new Date() : null
    } 
  });

  // Images
  if (Array.isArray(body.images)) {
    for (let i = 0; i < body.images.length; i++) {
      await db.productImage.create({
        data: {
          productId: product.id,
          url: body.images[i],
          position: i
        }
      });
    }
  }

  // Variants
  if (Array.isArray(body.variants)) {
    for (const v of body.variants) {
      const price = parseFloat(v.price) || 0;
      await db.productVariant.create({
        data: {
          productId: product.id,
          sku: v.sku,
          price,
          active: v.active
        }
      });
      // Inventory removed - no longer tracking stock
    }
  }

  return { data: product, status: 201, audit: { action: "PRODUCT_CREATED", entityType: "PRODUCT", entityId: product.id, after: product } };
});

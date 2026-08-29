import { NextRequest } from "next/server";
import { adminRoute } from "@/lib/server/admin";
import { AppError, object, stringField } from "@/modules/shared";

export const PATCH = (request: NextRequest, context: { params: Promise<{ id: string }> }) => adminRoute(request, "products.write", async ({ db }) => {
  const id = (await context.params).id;
  const body = object(await request.json());
  const before = await db.product.findUnique({ where: { id } });
  if (!before) throw new AppError("NOT_FOUND", "Không tìm thấy sản phẩm", 404);
  
  const status = stringField(body, "status", { optional: true, max: 20 });
  if (status && !['DRAFT', 'ACTIVE', 'ARCHIVED'].includes(status)) throw new AppError("VALIDATION_ERROR", "Trạng thái sản phẩm không hợp lệ", 400);
  
  const data: any = {
    name: stringField(body, "name", { optional: true, max: 200 }),
    shortDescription: stringField(body, "shortDescription", { optional: true, max: 500 }),
    status: status as any,
    featured: typeof body.featured === "boolean" ? body.featured : undefined,
    publishedAt: status === "ACTIVE" && !before.publishedAt ? new Date() : undefined
  };

  // Process variants if provided
  if (Array.isArray(body.variants)) {
    const existingVariants = await db.productVariant.findMany({ where: { productId: id } });
    const existingSkuIds = new Map(existingVariants.map(v => [v.sku, v.id]));
    const incomingSkus = new Set(body.variants.map((v: any) => v.sku));
    
    // Delete variants not in incoming array
    const toDelete = existingVariants.filter(v => !incomingSkus.has(v.sku)).map(v => v.id);
    if (toDelete.length > 0) {
      await db.productVariant.deleteMany({ where: { id: { in: toDelete } } });
    }

    for (const v of body.variants) {
      const price = parseFloat(v.price) || 0;
      if (existingSkuIds.has(v.sku)) {
        await db.productVariant.update({
          where: { id: existingSkuIds.get(v.sku)! },
          data: { price, active: v.active }
        });
        // Inventory update can be complex, let's keep it simple for MVP
        const inventory = await db.inventoryItem.findUnique({ where: { variantId: existingSkuIds.get(v.sku)! } });
        if (inventory) {
           await db.inventoryItem.update({
             where: { variantId: existingSkuIds.get(v.sku)! },
             data: { onHand: parseInt(v.stock) || 0 }
           });
        }
      } else {
        const newV = await db.productVariant.create({
          data: {
            productId: id,
            sku: v.sku,
            price,
            active: v.active
          }
        });
        await db.inventoryItem.create({
          data: { variantId: newV.id, onHand: parseInt(v.stock) || 0 }
        });
      }
    }
  }

  // Process images if provided
  if (Array.isArray(body.images)) {
    await db.productImage.deleteMany({ where: { productId: id } });
    for (let i = 0; i < body.images.length; i++) {
      await db.productImage.create({
        data: {
          productId: id,
          url: body.images[i],
          position: i
        }
      });
    }
  }

  const after = await db.product.update({ where: { id }, data });
  return { data: after, audit: { action: "PRODUCT_UPDATED", entityType: "PRODUCT", entityId: id, before, after } };
});

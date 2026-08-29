import { NextRequest } from "next/server";
import { adminRoute } from "@/lib/server/admin";
import { AppError, object, stringField } from "@/modules/shared";
import { uuidParam } from "@/lib/server/account";

export const PATCH = (request: NextRequest, context: { params: Promise<{ id: string }> }) => adminRoute(request, "products.write", async ({ db }) => {
  const id = uuidParam((await context.params).id);
  const body = object(await request.json());
  const before = await db.category.findUnique({ where: { id } });
  const rawParentId = stringField(body, "parentId", { optional: true, max: 50 });
  const parentId = rawParentId ? uuidParam(rawParentId, "parentId") : undefined;
  if (parentId === id) throw new AppError("VALIDATION_ERROR", "Danh mục không thể là cha của chính nó", 400);
  if (parentId) {
    const parents = await db.$queryRawUnsafe<Array<{ cycle: boolean }>>(`WITH RECURSIVE descendants AS (
+      SELECT id FROM categories WHERE parent_id=$1::uuid UNION ALL SELECT c.id FROM categories c JOIN descendants d ON c.parent_id=d.id
    ) SELECT EXISTS(SELECT 1 FROM descendants WHERE id=$2::uuid) AS cycle`, id, parentId);
    if (parents[0]?.cycle) throw new AppError("VALIDATION_ERROR", "Quan hệ danh mục tạo thành chu kỳ", 400);
    if (!(await db.category.findUnique({ where: { id: parentId }, select: { id: true } }))) throw new AppError("VALIDATION_ERROR", "Danh mục cha không tồn tại", 400);
  }
  if (!before) throw new AppError("NOT_FOUND", "Không tìm thấy danh mục", 404);
  const after = await db.category.update({ where: { id }, data: {
    name: stringField(body, "name", { optional: true, max: 120 }), slug: stringField(body, "slug", { optional: true, max: 140 }),
    description: stringField(body, "description", { optional: true }), parentId,
    imageUrl: stringField(body, "imageUrl", { optional: true }), position: Number.isInteger(body.position) ? Number(body.position) : undefined,
    active: typeof body.active === "boolean" ? body.active : undefined,
  } });
  return { data: after, audit: { action: "CATEGORY_UPDATED", entityType: "CATEGORY", entityId: id, before, after } };
});

export const DELETE = (request: NextRequest, context: { params: Promise<{ id: string }> }) => adminRoute(request, "products.write", async ({ db }) => {
  const id = uuidParam((await context.params).id);
  const category = await db.category.findUnique({ where: { id }, include: { _count: { select: { products: true, children: true } } } });
  if (!category) throw new AppError("NOT_FOUND", "Không tìm thấy danh mục", 404);
  if (category._count.products || category._count.children) throw new AppError("CONFLICT", "Danh mục đang có sản phẩm hoặc danh mục con", 409);
  await db.category.delete({ where: { id } });
  return { data: { id, deleted: true }, audit: { action: "CATEGORY_DELETED", entityType: "CATEGORY", entityId: id, before: category } };
});

import { NextRequest } from "next/server";
import { adminRoute, pageParams } from "@/lib/server/admin";
import { AppError, object, stringField } from "@/modules/shared";
import { uuidParam } from "@/lib/server/account";

export const GET = (request: NextRequest) => adminRoute(request, "products.read", async ({ db }) => {
  const { page, pageSize, skip } = pageParams(request);
  const q = request.nextUrl.searchParams.get("q")?.trim() || undefined;
  const where = q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { slug: { contains: q, mode: "insensitive" as const } }] } : {};
  const [items, total] = await db.$transaction([
    db.category.findMany({ where, include: { parent: true, _count: { select: { products: true, children: true } } }, orderBy: [{ position: "asc" }, { name: "asc" }], skip, take: pageSize }),
    db.category.count({ where }),
  ]);
  return { data: { items, meta: { page, pageSize, total } } };
});

export const POST = (request: NextRequest) => adminRoute(request, "products.write", async ({ db }) => {
  const body = object(await request.json());
  const rawParentId = stringField(body, "parentId", { optional: true, max: 50 });
  const parentId = rawParentId ? uuidParam(rawParentId, "parentId") : undefined;
  if (parentId && !(await db.category.findUnique({ where: { id: parentId }, select: { id: true } }))) throw new AppError("VALIDATION_ERROR", "Danh mục cha không tồn tại", 400);
  const item = await db.category.create({ data: {
    name: stringField(body, "name", { max: 120 })!, slug: stringField(body, "slug", { max: 140 })!,
    description: stringField(body, "description", { optional: true }), parentId,
    imageUrl: stringField(body, "imageUrl", { optional: true }), position: Number.isInteger(body.position) ? Number(body.position) : 0,
    active: body.active !== false,
  } });
  return { data: item, status: 201, audit: { action: "CATEGORY_CREATED", entityType: "CATEGORY", entityId: item.id, after: item } };
});

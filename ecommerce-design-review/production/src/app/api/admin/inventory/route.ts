import { NextRequest } from "next/server";
import { adminRoute, pageParams } from "@/lib/server/admin";
import { AppError, object, positiveInt, stringField } from "@/modules/shared";

export const GET = (request: NextRequest) => adminRoute(request, "products.read", async ({ db }) => {
  const { page, pageSize, skip } = pageParams(request);
  const items = await db.inventoryItem.findMany({ include: { variant: { include: { product: true } } }, orderBy: { updatedAt: "desc" }, skip, take: pageSize });
  const total = await db.inventoryItem.count();
  return { data: { items, meta: { page, pageSize, total } } };
});

export const PATCH = (request: NextRequest) => adminRoute(request, "inventory.write", async ({ db, actor }) => {
  const body = object(await request.json());
  const variantId = stringField(body, "variantId", { max: 50 })!;
  const direction = stringField(body, "direction", { max: 10 })!;
  const quantity = positiveInt(body.quantity, "quantity");
  if (!['INCREASE', 'DECREASE'].includes(direction)) throw new AppError("VALIDATION_ERROR", "direction không hợp lệ", 400);
  const result = await db.$transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe<Array<{ id: string; on_hand: number; reserved: number }>>("SELECT id,on_hand,reserved FROM inventory_items WHERE variant_id=$1::uuid FOR UPDATE", variantId);
    const before = rows[0];
    if (!before) throw new AppError("NOT_FOUND", "Không tìm thấy tồn kho", 404);
    const next = before.on_hand + (direction === "INCREASE" ? quantity : -quantity);
    if (next < before.reserved || next < 0) throw new AppError("CONFLICT", "Điều chỉnh làm tồn kho thấp hơn lượng đã giữ", 409);
    await tx.inventoryItem.update({ where: { id: before.id }, data: { onHand: next } });
    await tx.inventoryMovement.create({ data: { inventoryItemId: before.id, type: "ADJUSTMENT", quantity: direction === "INCREASE" ? quantity : -quantity, referenceType: "ADMIN", createdBy: actor.userId, note: stringField(body, "note", { optional: true, max: 500 }) } });
    return { before: before.on_hand, after: next, inventoryId: before.id };
  });
  return { data: result, audit: { action: "INVENTORY_ADJUSTED", entityType: "INVENTORY_ITEM", entityId: result.inventoryId, before: { onHand: result.before }, after: { onHand: result.after } } };
});


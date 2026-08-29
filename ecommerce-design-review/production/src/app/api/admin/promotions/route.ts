import { NextRequest } from "next/server";
import { adminRoute, pageParams } from "@/lib/server/admin";
import { adminAtomicMutationRoute } from "@/lib/server/admin-atomic";
import { uuidParam } from "@/lib/server/account";
import { AppError, object, positiveInt, stringField, vnd } from "@/modules/shared";

const types = ["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING"] as const;
const scopes = ["ORDER", "PRODUCT", "CATEGORY"] as const;

export const GET = (request: NextRequest) => adminRoute(request, "promotions.read", async ({ db }) => {
  const { page, pageSize, skip } = pageParams(request);
  const [items, total] = await db.$transaction([db.coupon.findMany({ orderBy: { createdAt: "desc" }, skip, take: pageSize }), db.coupon.count()]);
  return { data: { items, meta: { page, pageSize, total } } };
});

export const POST = (request: NextRequest) => adminAtomicMutationRoute(request, "promotions.write", async ({ tx }) => {
  const body = object(await request.json());
  const type = stringField(body, "type", { max: 30 })!;
  const scope = stringField(body, "scope", { optional: true, max: 20 }) ?? "ORDER";
  if (!types.includes(type as (typeof types)[number])) throw new AppError("VALIDATION_ERROR", "Loại ưu đãi không hợp lệ", 400);
  if (!scopes.includes(scope as (typeof scopes)[number])) throw new AppError("VALIDATION_ERROR", "Phạm vi ưu đãi không hợp lệ", 400);
  const value = type === "FREE_SHIPPING" ? vnd(1) : vnd(Number(body.value), "value");
  if (value <= 0 || (type === "PERCENTAGE" && value > 100)) throw new AppError("VALIDATION_ERROR", "Giá trị ưu đãi không hợp lệ", 400);
  const startsAt = parseDate(stringField(body, "startsAt", { max: 50 })!, "startsAt");
  const endsAt = parseDate(stringField(body, "endsAt", { max: 50 })!, "endsAt");
  if (endsAt <= startsAt) throw new AppError("VALIDATION_ERROR", "Ngày kết thúc phải sau ngày bắt đầu", 400);
  const usageLimit = optionalPositiveInt(body.usageLimit, "usageLimit");
  const usageLimitPerUser = optionalPositiveInt(body.usageLimitPerUser, "usageLimitPerUser");
  const productIds = uuidList(body.productIds, "productIds");
  const categoryIds = uuidList(body.categoryIds, "categoryIds");
  if (scope === "PRODUCT" && productIds.length === 0) throw new AppError("VALIDATION_ERROR", "Voucher sản phẩm cần ít nhất một sản phẩm", 400);
  if (scope === "CATEGORY" && categoryIds.length === 0) throw new AppError("VALIDATION_ERROR", "Voucher danh mục cần ít nhất một danh mục", 400);
  if (scope !== "PRODUCT" && productIds.length) throw new AppError("VALIDATION_ERROR", "productIds không phù hợp với phạm vi voucher", 400);
  if (scope !== "CATEGORY" && categoryIds.length) throw new AppError("VALIDATION_ERROR", "categoryIds không phù hợp với phạm vi voucher", 400);
  await assertReferences(tx, productIds, categoryIds);
  const coupon = await tx.coupon.create({ data: {
    code: stringField(body, "code", { max: 50 })!.toUpperCase(),
    name: stringField(body, "name", { max: 150 })!,
    description: stringField(body, "description", { optional: true }),
    type: type as (typeof types)[number], scope: scope as (typeof scopes)[number], value,
    minimumOrder: vnd(Number(body.minimumOrder ?? 0), "minimumOrder"),
    maximumDiscount: body.maximumDiscount == null ? undefined : vnd(Number(body.maximumDiscount), "maximumDiscount"),
    usageLimit, usageLimitPerUser, startsAt, endsAt, active: body.active !== false,
  } });
  for (const productId of productIds) await tx.$executeRawUnsafe("INSERT INTO coupon_products(coupon_id,product_id) VALUES($1::uuid,$2::uuid)", coupon.id, productId);
  for (const categoryId of categoryIds) await tx.$executeRawUnsafe("INSERT INTO coupon_categories(coupon_id,category_id) VALUES($1::uuid,$2::uuid)", coupon.id, categoryId);
  return { data: coupon, status: 201, audit: { action: "COUPON_CREATED", entityType: "COUPON", entityId: coupon.id, after: { ...coupon, productIds, categoryIds } } };
});

function parseDate(value: string, field: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError("VALIDATION_ERROR", `${field} không hợp lệ`, 400);
  return date;
}
function optionalPositiveInt(value: unknown, field: string): number | undefined {
  return value === undefined || value === null || value === "" ? undefined : positiveInt(value, field);
}
function uuidList(value: unknown, field: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 500) throw new AppError("VALIDATION_ERROR", `${field} không hợp lệ`, 400);
  return [...new Set(value.map((item) => uuidParam(typeof item === "string" ? item : "", field)))];
}
async function assertReferences(tx: Parameters<Parameters<typeof adminAtomicMutationRoute>[2]>[0]["tx"], productIds: string[], categoryIds: string[]) {
  if (productIds.length) {
    const [{ count }] = await tx.$queryRawUnsafe<Array<{ count: bigint }>>("SELECT COUNT(*)::bigint AS count FROM products WHERE id=ANY($1::uuid[]) AND deleted_at IS NULL", productIds);
    if (Number(count) !== productIds.length) throw new AppError("VALIDATION_ERROR", "Có sản phẩm áp dụng không tồn tại", 400);
  }
  if (categoryIds.length) {
    const [{ count }] = await tx.$queryRawUnsafe<Array<{ count: bigint }>>("SELECT COUNT(*)::bigint AS count FROM categories WHERE id=ANY($1::uuid[]) AND active=TRUE", categoryIds);
    if (Number(count) !== categoryIds.length) throw new AppError("VALIDATION_ERROR", "Có danh mục áp dụng không tồn tại", 400);
  }
}
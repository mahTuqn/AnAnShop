import { NextRequest } from "next/server";
import { adminAtomicMutationRoute } from "@/lib/server/admin-atomic";
import { uuidParam } from "@/lib/server/account";
import { AppError, object, positiveInt, stringField, vnd } from "@/modules/shared";

type Context = { params: Promise<{ id: string }> };

export const PATCH = (request: NextRequest, context: Context) => adminAtomicMutationRoute(request, "promotions.write", async ({ tx }) => {
  const id = uuidParam((await context.params).id, "couponId");
  const body = object(await request.json());
  const before = await tx.coupon.findUnique({ where: { id } });
  if (!before) throw new AppError("NOT_FOUND", "Không tìm thấy mã ưu đãi", 404);
  const startsAt = body.startsAt === undefined ? undefined : validDate(stringField(body, "startsAt", { max: 50 })!, "startsAt");
  const endsAt = body.endsAt === undefined ? undefined : validDate(stringField(body, "endsAt", { max: 50 })!, "endsAt");
  if ((endsAt ?? before.endsAt) <= (startsAt ?? before.startsAt)) throw new AppError("VALIDATION_ERROR", "Ngày kết thúc phải sau ngày bắt đầu", 400);
  const after = await tx.coupon.update({ where: { id }, data: {
    name: stringField(body, "name", { optional: true, max: 150 }),
    description: stringField(body, "description", { optional: true }),
    minimumOrder: body.minimumOrder === undefined ? undefined : vnd(Number(body.minimumOrder), "minimumOrder"),
    maximumDiscount: body.maximumDiscount === undefined ? undefined : body.maximumDiscount === null ? null : vnd(Number(body.maximumDiscount), "maximumDiscount"),
    usageLimit: body.usageLimit === undefined ? undefined : body.usageLimit === null ? null : positiveInt(body.usageLimit, "usageLimit"),
    usageLimitPerUser: body.usageLimitPerUser === undefined ? undefined : body.usageLimitPerUser === null ? null : positiveInt(body.usageLimitPerUser, "usageLimitPerUser"),
    startsAt, endsAt, active: typeof body.active === "boolean" ? body.active : undefined,
  } });
  return { data: after, audit: { action: "COUPON_UPDATED", entityType: "COUPON", entityId: id, before, after } };
});

export const DELETE = (request: NextRequest, context: Context) => adminAtomicMutationRoute(request, "promotions.write", async ({ tx }) => {
  const id = uuidParam((await context.params).id, "couponId");
  const before = await tx.coupon.findUnique({ where: { id } });
  if (!before) throw new AppError("NOT_FOUND", "Không tìm thấy mã ưu đãi", 404);
  const after = await tx.coupon.update({ where: { id }, data: { active: false } });
  return { data: { id, active: false }, audit: { action: "COUPON_DEACTIVATED", entityType: "COUPON", entityId: id, before, after } };
});

function validDate(value: string, field: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError("VALIDATION_ERROR", `${field} không hợp lệ`, 400);
  return date;
}
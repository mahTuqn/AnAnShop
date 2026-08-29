import { NextRequest } from "next/server";
import { adminRoute, pageParams } from "@/lib/server/admin";
import { AppError } from "@/modules/shared";

export const GET = (request: NextRequest) => adminRoute(request, "orders.read", async ({ db }) => {
  const { page, pageSize, skip } = pageParams(request);
  const status = request.nextUrl.searchParams.get("status");
  const allowed = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPING", "DELIVERED", "CANCELLED", "RETURN_REQUESTED", "RETURNED"] as const;
  if (status && !allowed.includes(status as typeof allowed[number])) throw new AppError("VALIDATION_ERROR", "Trạng thái đơn hàng không hợp lệ", 400);
  const where = status ? { status: status as typeof allowed[number] } : {};
  const [items, total] = await db.$transaction([db.order.findMany({ where, include: { items: true, addresses: true, payments: true }, orderBy: { placedAt: "desc" }, skip, take: pageSize }), db.order.count({ where })]);
  return { data: { items, meta: { page, pageSize, total } } };
});


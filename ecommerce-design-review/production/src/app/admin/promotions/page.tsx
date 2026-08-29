import { requireAdminPageSession } from "@/lib/admin/page-guard";
import { getPrisma } from "@/lib/server/prisma";
import { AdminPromotionsClient } from "@/components/admin/promotions-page-client";

export default async function Page() {
  await requireAdminPageSession("/admin/promotions", "promotions.read");
  const db = getPrisma();
  const rawCoupons = await db.coupon.findMany({
    orderBy: { createdAt: "desc" }
  });

  const redemptions = await db.$queryRawUnsafe<Array<{ coupon_id: string; count: bigint }>>(`
    SELECT coupon_id, COUNT(*)::bigint as count FROM coupon_redemptions GROUP BY coupon_id
  `);

  const coupons = rawCoupons.map(c => ({
    id: c.id,
    code: c.code,
    name: c.name,
    type: c.type,
    value: c.value.toString(),
    minimumOrder: c.minimumOrder.toString(),
    usageLimit: c.usageLimit,
    usedCount: Number(redemptions.find(r => r.coupon_id === c.id)?.count || 0),
    startsAt: c.startsAt.toLocaleString("vi-VN"),
    startsAtIso: c.startsAt.toISOString(),
    endsAt: c.endsAt.toLocaleString("vi-VN"),
    endsAtIso: c.endsAt.toISOString(),
    active: c.active,
  }));

  return <AdminPromotionsClient coupons={coupons} />;
}

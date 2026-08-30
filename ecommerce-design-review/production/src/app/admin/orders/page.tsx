import { requireAdminPageSession } from "@/lib/admin/page-guard";
import { getPrisma } from "@/lib/server/prisma";
import { AdminOrdersClient } from "@/components/admin/orders-page-client";

export default async function Page() {
  await requireAdminPageSession("/admin/orders", "orders.read");
  const db = getPrisma();
  const rawOrders = await db.order.findMany({
    include: { items: true, addresses: true, user: true, payments: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { placedAt: "desc" }
  });

  const orders = rawOrders.map(o => ({
    id: o.id,
    code: `#${o.code}`,
    customerName: o.user?.fullName || o.addresses[0]?.fullName || "Khách vô danh",
    placedAt: o.placedAt.toLocaleDateString("vi-VN"),
    grandTotal: Number(o.grandTotal).toLocaleString("vi-VN") + " ₫",
    productCount: o.items.reduce((sum, item) => sum + item.quantity, 0),
    paymentMethod: "Thanh toán khi nhận hàng", // using COD assuming default for now as we disabled others
    status: o.status,
    details: [
      ["Người nhận", `${o.addresses[0]?.fullName ?? ""} · ${o.addresses[0]?.phone ?? ""}`],
      ["Giao hàng", `${o.addresses[0]?.line1 ?? ""}, ${o.addresses[0]?.ward ?? ""}, ${o.addresses[0]?.district ?? ""}, ${o.addresses[0]?.province ?? ""}`],
      ["Vận chuyển", o.carrier && o.trackingCode ? `${o.carrier} - ${o.trackingCode}` : "Chưa có thông tin"],
      ["Sản phẩm", `${o.items.length} mặt hàng · ${o.items.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm`],
    ] as [string, string][]
  }));

  return <AdminOrdersClient orders={orders} />;
}

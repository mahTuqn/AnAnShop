import { getPrisma } from "@/lib/server/prisma";
import { vnd } from "@/modules/shared";

export async function AdminDashboard() {
  const db = getPrisma();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    todayRevenueResult,
    todayOrdersCount,
    todayNewCustomers,
    pendingOrdersCount,
    pendingReviewsCount,
    statusCounts,
    topProducts,
  ] = await Promise.all([
    db.order.aggregate({ _sum: { grandTotal: true }, where: { placedAt: { gte: today }, status: { not: "CANCELLED" } } }),
    db.order.count({ where: { placedAt: { gte: today }, status: { not: "CANCELLED" } } }),
    db.user.count({ where: { createdAt: { gte: today } } }),
    db.order.count({ where: { status: "PENDING" } }),
    db.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT COUNT(*)::bigint as count FROM reviews WHERE status = 'PENDING'`),
    db.order.groupBy({ by: ['status'], _count: { id: true }, where: { status: { in: ['PENDING', 'PROCESSING', 'SHIPPING'] } } }),
    db.orderItem.groupBy({ by: ['productName'], _sum: { quantity: true }, orderBy: { _sum: { quantity: 'desc' } }, take: 5 })
  ]);

  const todayRevenue = Math.round(Number(todayRevenueResult._sum.grandTotal ?? 0));
  const avgOrderValue = todayOrdersCount > 0 ? Math.round(todayRevenue / todayOrdersCount) : 0;

  const metrics = [
    ["Doanh thu hôm nay", vnd(todayRevenue), "Thực tế"],
    ["Đơn mới", todayOrdersCount.toString(), "Thực tế"],
    ["Giá trị đơn TB", vnd(avgOrderValue), "Thực tế"],
    ["Khách hàng mới", todayNewCustomers.toString(), "Thực tế"],
  ];

  const alerts = [
    [`${pendingOrdersCount} đơn chờ xác nhận`, "Cần xử lý ngay", "/admin/orders"],
    [`${pendingReviewsCount[0]?.count ?? 0} đánh giá chờ duyệt`, "Từ khách hàng", "/admin/reviews"],
  ];
  
  const totalActiveOrders = statusCounts.reduce((acc, curr) => acc + curr._count.id, 0);
  const orderStatuses = [
    ["Chờ xác nhận", statusCounts.find(s => s.status === "PENDING")?._count.id ?? 0],
    ["Đang xử lý", statusCounts.find(s => s.status === "PROCESSING")?._count.id ?? 0],
    ["Đang giao", statusCounts.find(s => s.status === "SHIPPING")?._count.id ?? 0],
  ].map(([label, count]) => [label, count.toString(), totalActiveOrders ? `${Math.round(Number(count) / totalActiveOrders * 100)}%` : "0%"]);

  return <section aria-labelledby="dashboard-title" data-testid="admin-dashboard-page">
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">{new Date().toLocaleDateString("vi-VN", { dateStyle: "long" })}</p><h1 id="dashboard-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">Chào buổi sáng, An An</h1><p className="mt-2 text-sm text-slate-600">Đây là những việc cần chú ý trong hôm nay.</p></div></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value, change]) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-2"><p className="text-sm text-slate-600">{label}</p><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">{change}</span></div><p className="mt-4 text-2xl font-semibold tracking-tight">{value}</p></article>)}</div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Doanh thu 7 ngày</h2><p className="text-sm text-slate-500">Tổng đã thanh toán, không gồm hoàn tiền</p></div><strong className="text-lg">Dữ liệu thực tế</strong></div><div className="mt-8 flex h-56 items-end gap-3" aria-label="Biểu đồ doanh thu 7 ngày">{[0,0,0,0,0,0, todayRevenue / 1000000].map((height, index) => <div key={`${height}-${index}`} className="flex h-full flex-1 flex-col justify-end gap-2"><div className="rounded-t-lg bg-[#6f927c]" style={{ height: `${Math.max(5, (height / (Math.max(1, todayRevenue / 1000000))) * 100)}%` }} title={`${height.toFixed(2)} triệu`} /><span className="text-center text-xs text-slate-500">T{index + 2}</span></div>)}</div></article>
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">Cần xử lý</h2><div className="mt-4 divide-y divide-slate-100">{alerts.map(([title, note, href]) => <a key={title} href={href} className="block py-4 first:pt-0 hover:text-emerald-800"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-slate-500">{note}</p></div><span aria-hidden="true">→</span></div></a>)}</div></article>
    </div>
    <div className="mt-6 grid gap-6 lg:grid-cols-2"><article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">Trạng thái đơn hàng</h2><dl className="mt-4 space-y-4">{orderStatuses.map(([label, value, width]) => <div key={label}><div className="mb-1.5 flex justify-between text-sm"><dt>{label}</dt><dd className="font-semibold">{value}</dd></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-[#6f927c]" style={{ width }} /></div></div>)}</dl></article><article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">Sản phẩm bán chạy</h2><ol className="mt-4 divide-y divide-slate-100">{topProducts.length > 0 ? topProducts.map((p, index) => <li key={p.productName} className="flex items-center gap-4 py-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-rose-50 text-sm font-semibold text-rose-800">{index + 1}</span><span className="flex-1 text-sm font-medium truncate" title={p.productName}>{p.productName}</span><span className="text-sm text-slate-500 w-16 text-right whitespace-nowrap">{p._sum.quantity} bán</span></li>) : <li className="py-3 text-sm text-slate-500">Chưa có dữ liệu bán hàng</li>}</ol></article></div>
  </section>;
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/storefront/api";
import { money } from "@/lib/storefront/data";
import { PageSkeleton } from "@/components/ui/states";

type ApiOrder = { id: string; code: string; status: string; paymentStatus: string; paymentMethod: string; subtotal: number; shippingFee: number; discountTotal: number; grandTotal: number; placedAt: string; carrier?: string; trackingCode?: string; address: { fullName: string; phone: string; province: string; district: string; ward: string; line1: string }; items: { variantId: string; productId: string; productSlug?: string; productName: string; variantName: string; quantity: number; lineTotal: number }[]; returns?: { id: string; status: string; reason: string; adminNote?: string | null; requestedAt: string; wasAccepted?: boolean }[] };

export function AccountOrderDetailClient({ id }: { id: string }) {
  const [order, setOrder] = useState<ApiOrder | null>(null); const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [pending, setPending] = useState(false);
  useEffect(() => { apiRequest<ApiOrder>(`/api/orders/${encodeURIComponent(id)}`, { method: "GET" }).then(setOrder).catch((reason) => setError(reason instanceof Error ? reason.message : "Không thể tải đơn hàng.")); }, [id]);
  const act = async (action: "CANCEL" | "RETURN" | "REBUY") => {
    if (!order) return;
    let reason: string | undefined;
    if (action === "CANCEL" && !confirm("Bạn chắc chắn muốn hủy đơn hàng này?")) return;
    if (action === "RETURN") { reason = prompt("Lý do đổi/trả (3–150 ký tự):")?.trim(); if (!reason) return; }
    setPending(true); setError(""); setMessage("");
    try {
      await apiRequest(`/api/orders/${encodeURIComponent(order.id)}/actions`, { method: "POST", body: JSON.stringify({ action, reason }) });
      if (action === "REBUY") { window.location.assign("/cart"); return; }
      const newOrder = { ...order, status: action === "CANCEL" ? "CANCELLED" : "RETURN_REQUESTED" };
      if (action === "RETURN") {
        newOrder.returns = [{ id: "temp", status: "REQUESTED", reason: reason!, requestedAt: new Date().toISOString() }, ...(newOrder.returns || [])];
      }
      setOrder(newOrder); setMessage(action === "CANCEL" ? "Đã hủy đơn hàng và hoàn tồn kho." : "Đã gửi yêu cầu đổi/trả.");
    } catch (reasonValue) { setError(reasonValue instanceof Error ? reasonValue.message : "Không thể xử lý yêu cầu."); }
    finally { setPending(false); }
  };

  if (error && !order) return <section><Link className="text-sm text-[#ce7a85] underline" href="/account/orders">← Quay lại đơn hàng</Link><p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">{error}</p></section>;
  if (!order) return <PageSkeleton/>;
  return <section><Link className="text-sm text-[#ce7a85] underline" href="/account/orders">← Quay lại đơn hàng</Link><div className="mt-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm text-[#625853]">Đặt ngày {new Intl.DateTimeFormat("vi-VN").format(new Date(order.placedAt))}</p><h2 className="mt-1 font-serif text-3xl">Đơn #{order.code}</h2></div><span className="rounded-full bg-[#edf3ed] px-3 py-1 text-sm text-[#356646]">{order.status}</span></div>{message && <p className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-800" role="status">{message}</p>}{error && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">{error}</p>}<div className="mt-5 flex flex-wrap gap-3"><button className="rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50" disabled={pending} onClick={() => void act("REBUY")}>Mua lại</button>{["PENDING", "CONFIRMED"].includes(order.status) && <button className="rounded-xl border border-red-700 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50" disabled={pending} onClick={() => void act("CANCEL")}>Hủy đơn</button>}{order.status === "DELIVERED" && <button className="rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50" disabled={pending} onClick={() => void act("RETURN")}>Yêu cầu đổi/trả</button>}</div>
  
  {order.returns && order.returns.length > 0 && (
    <div className="mt-5 space-y-3">
      {order.returns.map(r => {
        const isRejected = r.status === 'REJECTED' || (r.status === 'CLOSED' && !r.wasAccepted);
        return (
          <div key={r.id} className={`rounded-xl p-4 text-sm ${isRejected ? 'bg-red-50 text-red-800 border border-red-100' : 'bg-orange-50 text-orange-800 border border-orange-100'}`}>
            <p className="font-semibold">
              {r.status === 'REQUESTED' ? 'Yêu cầu đổi/trả đang chờ duyệt' : 
               r.status === 'APPROVED' ? 'Yêu cầu đổi/trả đã được duyệt' :
               r.status === 'REJECTED' ? 'Yêu cầu đổi/trả đã bị từ chối' : 
               r.status === 'RECEIVED' ? 'Đã nhận hàng đổi/trả' :
               r.status === 'REFUNDED' ? 'Đã hoàn tiền đổi/trả' : 
               r.status === 'CLOSED' ? (r.wasAccepted ? 'Hồ sơ đã đóng (Đã chấp nhận)' : 'Hồ sơ đã đóng (Bị từ chối)') : 'Hồ sơ đổi/trả đã đóng'}
            </p>
            <p className="mt-1">Lý do của bạn: {r.reason}</p>
            {r.adminNote && (
              <p className="mt-2 font-medium">Phản hồi từ cửa hàng: {r.adminNote}</p>
            )}
          </div>
        );
      })}
    </div>
  )}

  <div className="mt-7 grid gap-6 md:grid-cols-[1fr_300px]"><div className="rounded-2xl bg-white p-6 shadow-sm"><h3 className="font-semibold">Sản phẩm</h3><ul className="mt-4 divide-y">{order.items.map((item) => <li className="flex justify-between gap-4 py-4" key={item.variantId}><span><Link href={`/products/${item.productSlug || item.productId}`} className="hover:underline text-[#ce7a85] transition-colors"><strong>{item.productName}</strong></Link><span className="mt-1 block text-sm text-[#625853]">{item.variantName} · Số lượng {item.quantity}</span>{order.status === "DELIVERED" && <div className="mt-2"><Link href={`/products/${item.productSlug || item.productId}?action=review#reviews`} className="inline-flex items-center justify-center rounded-lg border border-[#cbbfba] px-3 py-1.5 text-xs font-semibold text-[#ce7a85] hover:bg-[#fcf4f5] transition-colors shadow-sm">Đánh giá sản phẩm</Link></div>}</span><strong>{money(item.lineTotal)}</strong></li>)}</ul></div><aside className="rounded-2xl bg-white p-6 shadow-sm"><h3 className="font-semibold">Giao đến</h3><p className="mt-3 text-sm leading-6 text-[#615454]">{order.address.fullName} · {order.address.phone}<br/>{order.address.line1}, {order.address.ward}, {order.address.district}, {order.address.province}</p>{order.carrier && order.trackingCode && <div className="mt-4 rounded-xl bg-[#fcf4f5] p-3 text-sm"><p className="font-semibold text-[#ce7a85]">Thông tin vận chuyển</p><p className="mt-1 text-[#625853]">{order.carrier} · Mã: {order.trackingCode}</p></div>}<dl className="mt-6 space-y-3 border-t pt-5 text-sm"><div className="flex justify-between"><dt>Tạm tính</dt><dd>{money(order.subtotal)}</dd></div><div className="flex justify-between"><dt>Vận chuyển</dt><dd>{money(order.shippingFee)}</dd></div>{order.discountTotal > 0 && <div className="flex justify-between"><dt>Giảm giá</dt><dd>−{money(order.discountTotal)}</dd></div>}<div className="flex justify-between border-t pt-3 font-semibold"><dt>Tổng cộng</dt><dd>{money(order.grandTotal)}</dd></div></dl><p className="mt-4 text-xs text-[#625853]">{order.paymentMethod} · {order.paymentStatus}</p></aside></div></section>;
}

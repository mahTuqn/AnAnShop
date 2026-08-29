"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/storefront/api";
import { money } from "@/lib/storefront/data";
import { EmptyState, PageSkeleton } from "@/components/ui/states";

type ApiOrder = { id: string; code: string; status: string; paymentStatus: string; grandTotal: number; placedAt: string; items: { quantity: number; productName?: string; variantName?: string; imageUrl?: string }[] };
const statusLabels: Record<string, string> = { PENDING: "Chờ xác nhận", CONFIRMED: "Đã xác nhận", PROCESSING: "Đang xử lý", SHIPPING: "Đang giao", DELIVERED: "Đã giao", CANCELLED: "Đã hủy", RETURN_REQUESTED: "Đang yêu cầu trả", RETURNED: "Đã trả", CLOSED: "Đã đóng" };

export function AccountOrdersClient() {
  const [orders, setOrders] = useState<ApiOrder[] | null>(null); const [error, setError] = useState("");
  useEffect(() => { apiRequest<ApiOrder[]>("/api/orders", { method: "GET" }).then(setOrders).catch((reason) => { setError(reason instanceof Error ? reason.message : "Không thể tải đơn hàng."); setOrders([]); }); }, []);
  if (!orders) return <PageSkeleton/>;
  if (!orders.length) return <>{error && <p className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">{error}</p>}<EmptyState title="Chưa có đơn hàng" description="Các đơn hàng đã đặt sẽ xuất hiện tại đây." actionHref="/products" action="Bắt đầu mua sắm"/></>;
  
  return (
    <div className="space-y-6">
      {orders.map((order) => (
        <article className="rounded-2xl border border-[#e4dad5] bg-white p-5" key={order.id}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <span>
              <strong>#{order.code}</strong>
              <span className="ml-3 text-sm text-[#625853]">{new Intl.DateTimeFormat("vi-VN").format(new Date(order.placedAt))}</span>
            </span>
            <span className="rounded-full bg-[#edf3ed] px-3 py-1 text-sm text-[#356646]">{statusLabels[order.status] ?? order.status}</span>
          </div>
          
          <div className="py-4 space-y-4">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex gap-4 items-start">
                <div className="size-16 shrink-0 rounded-lg bg-gray-50 border overflow-hidden">
                  {item.imageUrl ? <img src={item.imageUrl} alt={item.productName || "Sản phẩm"} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-100" />}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#ce7a85] line-clamp-1">{item.productName || "Sản phẩm"}</h4>
                  <p className="text-sm text-[#625853] mt-1">{item.variantName} x {item.quantity}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-4 border-t pt-4">
            <span className="text-sm">
              Tổng tiền: <strong>{money(order.grandTotal)}</strong>
            </span>
            <Link className="text-sm font-semibold text-white bg-[#ce7a85] px-4 py-2 rounded-xl hover:bg-[#5a2f27] transition-colors" href={`/account/orders/${order.id}`}>
              Xem chi tiết
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

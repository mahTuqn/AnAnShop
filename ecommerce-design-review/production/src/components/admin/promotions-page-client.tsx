"use client";

import { useState } from "react";
import { AccessibleDialog } from "./accessible-dialog";
import { createPromotion, togglePromotionStatus, updatePromotion } from "@/app/admin/promotions/actions";
import { money } from "@/lib/storefront/data";

type Coupon = {
  id: string;
  code: string;
  name: string;
  type: string;
  value: string;
  minimumOrder: string;
  usageLimit: number | null;
  usedCount: number;
  startsAt: string;
  startsAtIso: string;
  endsAt: string;
  endsAtIso: string;
  active: boolean;
};

export function AdminPromotionsClient({ coupons }: { coupons: Coupon[] }) {
  const [query, setQuery] = useState("");
  const [editingCoupon, setEditingCoupon] = useState<Coupon | "new" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const shown = coupons.filter(c => c.code.toLowerCase().includes(query.toLowerCase()) || c.name.toLowerCase().includes(query.toLowerCase()));

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      const payload = {
        code: String(form.get("code")),
        name: String(form.get("name")),
        type: String(form.get("type")),
        value: Number(form.get("value")) || 0,
        minimumOrder: Number(form.get("minimumOrder")) || 0,
        usageLimit: Number(form.get("usageLimit")) || 0,
        startsAt: String(form.get("startsAt")),
        endsAt: String(form.get("endsAt")),
      };
      
      if (editingCoupon === "new") {
        await createPromotion(payload);
      } else if (editingCoupon) {
        await updatePromotion(editingCoupon.id, payload);
      }
      setEditingCoupon(null);
    } catch (e: any) {
      alert(e.message || "Lỗi tạo khuyến mãi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await togglePromotionStatus(id, active);
    } catch (e) {
      alert("Lỗi cập nhật trạng thái");
    }
  };

  return <section aria-labelledby="promotions-title" data-testid="admin-promotions-page">
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">An An Backoffice</p>
        <h1 id="promotions-title" className="text-2xl font-semibold sm:text-3xl">Khuyến mãi</h1>
        <p className="mt-2 text-sm text-slate-600">Quản lý và tạo các chương trình giảm giá thật từ Database.</p>
      </div>
      <button type="button" onClick={() => setEditingCoupon("new")} className="min-h-11 rounded-xl bg-[#173c32] px-5 text-sm font-semibold text-white">+ Tạo khuyến mãi mới</button>
    </div>
    
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3">
      <label><span className="sr-only">Tìm mã khuyến mãi</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo mã hoặc tên..." className="min-h-11 w-full rounded-xl border border-slate-300 px-4" /></label>
    </div>

    {shown.length ? <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[820px] text-left text-sm">
      <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Mã Code</th><th className="px-5 py-3">Tên chương trình</th><th className="px-5 py-3">Mức giảm</th><th className="px-5 py-3">Đơn tối thiểu</th><th className="px-5 py-3">Đã dùng / Giới hạn</th><th className="px-5 py-3">Thời hạn</th><th className="px-5 py-3">Trạng thái</th><th className="px-5 py-3 text-right">Thao tác</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{shown.map((item) => <tr key={item.id}>
        <td className="px-5 py-4 font-semibold uppercase">{item.code}</td>
        <td className="px-5 py-4">{item.name}</td>
        <td className="px-5 py-4 font-medium text-emerald-700">{item.type === "FREE_SHIPPING" ? "Miễn phí ship" : item.type === "PERCENTAGE" ? `${item.value}%` : money(Number(item.value))}</td>
        <td className="px-5 py-4">{money(Number(item.minimumOrder))}</td>
        <td className="px-5 py-4">{item.usedCount} / {item.usageLimit || "∞"}</td>
        <td className="px-5 py-4 text-xs">{item.startsAt}<br/><span className="text-slate-400">đến</span><br/>{item.endsAt}</td>
        <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{item.active ? "Đang chạy" : "Tạm dừng"}</span></td>
        <td className="px-5 py-4 text-right space-x-3">
          <button onClick={() => setEditingCoupon(item)} className="text-[#173c32] underline font-medium hover:text-[#0f2821]">Sửa</button>
          <button onClick={() => handleToggle(item.id, !item.active)} className="text-emerald-800 underline font-medium">{item.active ? "Dừng" : "Bật"}</button>
        </td>
      </tr>)}</tbody>
    </table></div> : <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center"><h2 className="font-semibold">Chưa có mã khuyến mãi nào</h2></div>}

    <AccessibleDialog open={!!editingCoupon} title={editingCoupon === "new" ? "Tạo mã khuyến mãi mới" : "Sửa mã khuyến mãi"} onClose={() => setEditingCoupon(null)} footer={<><button type="button" onClick={() => setEditingCoupon(null)} className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-semibold">Hủy</button><button type="submit" form="promo-create-form" disabled={submitting} className="min-h-11 rounded-xl bg-[#173c32] px-5 text-sm font-semibold text-white">{submitting ? "Đang lưu..." : "Lưu mã"}</button></>}>
      {editingCoupon && <form id="promo-create-form" onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Mã code (Viết liền, không dấu) <input name="code" required className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3 uppercase" placeholder="VD: ANAN10" defaultValue={editingCoupon !== "new" ? editingCoupon.code : ""} /></label>
        <label className="text-sm font-medium">Tên chương trình <input name="name" required className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3" placeholder="VD: Giảm 10% khai trương" defaultValue={editingCoupon !== "new" ? editingCoupon.name : ""} /></label>
        <label className="text-sm font-medium">Loại giảm giá <select name="type" className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3" defaultValue={editingCoupon !== "new" ? editingCoupon.type : "PERCENTAGE"}><option value="PERCENTAGE">Giảm theo %</option><option value="FIXED_AMOUNT">Giảm số tiền cố định</option><option value="FREE_SHIPPING">Miễn phí vận chuyển</option></select></label>
        <label className="text-sm font-medium">Mức giảm (Nhập số % hoặc số tiền) <input name="value" type="number" required defaultValue={editingCoupon !== "new" ? editingCoupon.value : "10"} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3" /></label>
        <label className="text-sm font-medium">Giá trị đơn hàng tối thiểu (₫) <input name="minimumOrder" type="number" required defaultValue={editingCoupon !== "new" ? editingCoupon.minimumOrder : "500000"} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3" /></label>
        <label className="text-sm font-medium">Giới hạn số lượt dùng (0 = không giới hạn) <input name="usageLimit" type="number" required defaultValue={editingCoupon !== "new" ? (editingCoupon.usageLimit || 0) : "100"} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3" /></label>
        <label className="text-sm font-medium">Thời gian bắt đầu <input name="startsAt" type="datetime-local" required className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3" defaultValue={editingCoupon !== "new" ? new Date(new Date(editingCoupon.startsAtIso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16) : new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} /></label>
        <label className="text-sm font-medium">Thời gian kết thúc <input name="endsAt" type="datetime-local" required className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3" defaultValue={editingCoupon !== "new" ? new Date(new Date(editingCoupon.endsAtIso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} /></label>
      </form>}
    </AccessibleDialog>
  </section>;
}

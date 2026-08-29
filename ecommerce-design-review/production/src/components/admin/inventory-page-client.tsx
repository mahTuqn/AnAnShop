"use client";

import { useState } from "react";
import { AccessibleDialog } from "./accessible-dialog";
import { updateInventory } from "@/app/admin/inventory/actions";

type InventoryRow = {
  variantId: string;
  sku: string;
  productName: string;
  variantName: string;
  onHand: number;
  available: number;
  status: string;
  updatedAt: string;
};

export function AdminInventoryClient({ rows }: { rows: InventoryRow[] }) {
  const [query, setQuery] = useState("");
  const [editingRow, setEditingRow] = useState<InventoryRow | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const shown = rows.filter(r => r.sku.toLowerCase().includes(query.toLowerCase()) || r.productName.toLowerCase().includes(query.toLowerCase()));

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingRow) return;
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      await updateInventory(editingRow.variantId, Number(form.get("onHand")) || 0);
      setEditingRow(null);
    } catch (e: any) {
      alert(e.message || "Lỗi cập nhật tồn kho");
    } finally {
      setSubmitting(false);
    }
  };

  return <section aria-labelledby="inventory-title" data-testid="admin-inventory-page">
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">An An Backoffice</p>
        <h1 id="inventory-title" className="text-2xl font-semibold sm:text-3xl">Tồn kho</h1>
        <p className="mt-2 text-sm text-slate-600">Theo dõi tồn thực, lượng giỏ hàng và lịch sử điều chỉnh theo SKU.</p>
      </div>
      <button type="button" onClick={() => {}} className="min-h-11 rounded-xl bg-[#173c32] px-5 text-sm font-semibold text-white">+ Điều chỉnh</button>
    </div>
    
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3">
      <label><span className="sr-only">Tìm trong tồn kho</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm trong tồn kho..." className="min-h-11 w-full rounded-xl border border-slate-300 px-4" /></label>
    </div>

    {shown.length ? <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[820px] text-left text-sm">
      <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">SKU</th><th className="px-5 py-3">Sản phẩm / Biến thể</th><th className="px-5 py-3">Tồn thực</th><th className="px-5 py-3">Khả dụng</th><th className="px-5 py-3">Cập nhật gần nhất</th><th className="px-5 py-3">Trạng thái</th><th className="px-5 py-3 text-right">Thao tác</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{shown.map((item) => <tr key={item.variantId}>
        <td className="px-5 py-4 font-semibold">{item.sku}</td>
        <td className="px-5 py-4">{item.productName}{item.variantName ? ` - ${item.variantName}` : ''}</td>
        <td className="px-5 py-4 font-medium">{item.onHand}</td>
        <td className="px-5 py-4 font-bold">{item.available}</td>
        <td className="px-5 py-4 text-xs text-slate-500">{item.updatedAt}</td>
        <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.status === "Bình thường" ? "bg-emerald-50 text-emerald-800" : item.status === "Sắp hết" ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-800"}`}>{item.status}</span></td>
        <td className="px-5 py-4 text-right">
          <button onClick={() => setEditingRow(item)} className="text-[#173c32] underline font-medium hover:text-[#0f2821]">Chi tiết</button>
        </td>
      </tr>)}</tbody>
    </table></div> : <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center"><h2 className="font-semibold">Chưa có dữ liệu tồn kho</h2></div>}

    <AccessibleDialog open={!!editingRow} title={"Chi tiết tồn kho"} onClose={() => setEditingRow(null)} footer={<><button type="button" onClick={() => setEditingRow(null)} className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-semibold">Hủy</button><button type="submit" form="inventory-update-form" disabled={submitting} className="min-h-11 rounded-xl bg-[#173c32] px-5 text-sm font-semibold text-white">{submitting ? "Đang lưu..." : "Lưu"}</button></>}>
      {editingRow && <form id="inventory-update-form" onSubmit={handleSave} className="grid gap-4 sm:grid-cols-1">
        <div className="mb-2">
          <h3 className="font-semibold">{editingRow.productName}</h3>
          <p className="text-sm text-slate-600">SKU: {editingRow.sku}</p>
        </div>
        <label className="text-sm font-medium">Tồn thực (Số lượng có trong kho) <input name="onHand" type="number" required className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3" defaultValue={editingRow.onHand} /></label>
      </form>}
    </AccessibleDialog>
  </section>;
}

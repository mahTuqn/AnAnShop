"use client";

import { useMemo, useState } from "react";
import { AccessibleDialog } from "./accessible-dialog";
import { AdminAsyncState } from "./admin-async-state";
import { ProductEditorLink } from "./product-editor-link";
import type { AdminResource, AdminRow } from "@/lib/admin/admin-data";

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Accessible replacement for resource-page.tsx. */
export function AdminResourcePageV2({ resource, resourceKey }: { resource: AdminResource; resourceKey: string }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Tất cả");
  const [selected, setSelected] = useState<AdminRow | null>(null);
  const [creating, setCreating] = useState(false);
  const shown = useMemo(() => resource.rows.filter((item) => normalize([...item.cells, item.status].join(" ")).includes(normalize(query)) && (status === "Tất cả" || item.status === status)), [query, resource.rows, status]);
  const closeDetail = () => setSelected(null);
  const closeCreate = () => setCreating(false);

  return <section aria-labelledby={`${resourceKey}-title`} data-testid={`admin-${resourceKey}-page`}>
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">An An Backoffice</p><h1 id={`${resourceKey}-title`} className="text-2xl font-semibold sm:text-3xl">{resource.title}</h1><p className="mt-2 text-sm text-slate-600">{resource.description}</p></div>{resource.createLabel && <button type="button" onClick={() => setCreating(true)} className="min-h-11 rounded-xl bg-[#173c32] px-5 text-sm font-semibold text-white" data-testid={`${resourceKey}-create`}>+ {resource.createLabel}</button>}</div>
    <div className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_220px]"><label><span className="sr-only">Tìm trong {resource.title}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Tìm trong ${resource.title.toLowerCase()}…`} className="min-h-11 w-full rounded-xl border border-slate-300 px-4" data-testid={`${resourceKey}-search`} /></label><label><span className="sr-only">Lọc theo trạng thái</span><select value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3" data-testid={`${resourceKey}-status-filter`}><option>Tất cả</option>{resource.statuses.map((item) => <option key={item}>{item}</option>)}</select></label></div>
    <AdminAsyncState empty={!shown.length}><div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{resource.headers.map((header) => <th scope="col" key={header} className="px-5 py-3">{header}</th>)}<th scope="col" className="px-5 py-3">Trạng thái</th><th scope="col"><span className="sr-only">Thao tác</span></th></tr></thead><tbody className="divide-y divide-slate-100">{shown.map((item) => <tr key={item.id}>{item.cells.map((cell, index) => <td key={`${item.id}-${index}`} className="px-5 py-4">{resourceKey === "products" && index === 0 ? <ProductEditorLink id={item.id} label={cell} /> : cell}</td>)}<td className="px-5 py-4"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">{item.status}</span></td><td className="px-5 py-4 text-right"><button type="button" onClick={() => setSelected(item)} className="min-h-10 rounded-lg px-3 font-semibold text-emerald-800" aria-label={`Xem chi tiết ${item.cells[0]}`}>Chi tiết</button></td></tr>)}</tbody></table></div></AdminAsyncState>
    <AccessibleDialog open={Boolean(selected)} title="Chi tiết" onClose={closeDetail} footer={<><button type="button" className="min-h-11 rounded-xl bg-[#173c32] px-5 text-sm font-semibold text-white">Cập nhật</button><button type="button" onClick={closeDetail} className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-semibold">Đóng</button></>}>{selected && <><h3 className="font-semibold">{selected.cells[0]}</h3><dl className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">{selected.detail.map(([label, value]) => <div key={label} className="grid gap-1 p-4 sm:grid-cols-[140px_1fr]"><dt className="text-sm text-slate-500">{label}</dt><dd className="text-sm font-medium">{value}</dd></div>)}</dl></>}</AccessibleDialog>
    <AccessibleDialog open={creating} title={resource.createLabel ?? "Tạo mới"} onClose={closeCreate} footer={<><button type="button" onClick={closeCreate} className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-semibold">Hủy</button><button type="submit" form={`${resourceKey}-create-form`} className="min-h-11 rounded-xl bg-[#173c32] px-5 text-sm font-semibold text-white" data-testid={`${resourceKey}-submit`}>Lưu bản nháp</button></>}><form id={`${resourceKey}-create-form`} onSubmit={(event) => { event.preventDefault(); closeCreate(); }} className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Tên / mã<input required className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3" /></label><label className="text-sm font-medium">Trạng thái<select className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3">{resource.statuses.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-sm font-medium sm:col-span-2">Ghi chú<textarea rows={4} className="mt-1.5 w-full rounded-xl border border-slate-300 p-3" /></label></form></AccessibleDialog>
  </section>;
}


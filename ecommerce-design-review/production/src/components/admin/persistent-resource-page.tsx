"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminResource } from "@/lib/admin/admin-data";
import { AccessibleDialog } from "./accessible-dialog";

type SupportedKey = "customers" | "categories" | "reviews" | "content";
type Row = { id: string; cells: string[]; status: string; rawStatus: string; detail: Array<[string, string]> };
const money = (value: unknown) => `${Number(value ?? 0).toLocaleString("vi-VN")} ₫`;
const date = (value: unknown) => value ? new Date(String(value)).toLocaleDateString("vi-VN") : "—";
const statusLabel = (status: string) => ({ ACTIVE: "Hoạt động", BLOCKED: "Đã khóa", PENDING_VERIFICATION: "Chờ xác minh", PENDING: "Chờ duyệt", APPROVED: "Đã duyệt", REJECTED: "Đã ẩn", PUBLISHED: "Đã đăng", DRAFT: "Bản nháp", ARCHIVED: "Đã lưu trữ", true: "Hiển thị", false: "Ẩn" }[status] ?? status);

function toRow(key: SupportedKey, item: Record<string, unknown>): Row {
  const id = String(item.id);
  if (key === "customers") {
    const rawStatus = String(item.status);
    return { id, rawStatus, status: statusLabel(rawStatus), cells: [String(item.full_name ?? "—"), String(item.email ?? item.phone ?? "—"), String(item.order_count ?? 0), money(item.lifetime_spend), date(item.last_order_at)], detail: [["Điện thoại", String(item.phone ?? "—")], ["Hạng thành viên", String(item.tier ?? "NORMAL")], ["Địa chỉ đã lưu", String(item.address_count ?? 0)], ["Ngày tham gia", date(item.created_at)]] };
  }
  if (key === "categories") {
    const rawStatus = String(item.active);
    const count = (item._count as Record<string, unknown> | undefined)?.products ?? 0;
    const parent = item.parent as Record<string, unknown> | null | undefined;
    return { id, rawStatus, status: statusLabel(rawStatus), cells: [String(item.name), String(parent?.name ?? "—"), String(item.slug), String(count), String(item.position ?? 0)], detail: [["Mô tả", String(item.description ?? "—")], ["Danh mục con", String((item._count as Record<string, unknown> | undefined)?.children ?? 0)]] };
  }
  if (key === "reviews") {
    const rawStatus = String(item.status);
    return { id, rawStatus, status: statusLabel(rawStatus), cells: [String(item.customer_name), String(item.product_name), `${item.rating} / 5`, date(item.created_at), String(item.order_code ?? "—")], detail: [["Nội dung", String(item.content ?? "—")], ["Mua hàng xác thực", item.verified_purchase ? "Có" : "Không"], ["Ảnh đính kèm", String(Array.isArray(item.images) ? item.images.length : 0)]] };
  }
  const rawStatus = String(item.status);
  return { id, rawStatus, status: statusLabel(rawStatus), cells: [String(item.title), String(item.type), String(item.slug), date(item.updated_at), String(item.author_name ?? "—")], detail: [["Tóm tắt", String(item.excerpt ?? "—")], ["Ngày xuất bản", date(item.published_at)], ["Ảnh đại diện", String(item.featured_image_url ?? "—")]] };
}

export function PersistentAdminResourcePage({ resource, resourceKey }: { resource: AdminResource; resourceKey: SupportedKey }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [contentType, setContentType] = useState("BANNER");
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ pageSize: "100" });
      if (query.trim()) params.set("q", query.trim());
      if (status !== "ALL" && resourceKey !== "categories" && resourceKey !== "content") params.set("status", status);
      const response = await fetch(`/api/admin/${resourceKey}?${params}`, { credentials: "same-origin" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Không thể tải dữ liệu");
      const items = Array.isArray(payload.data) ? payload.data : payload.data?.items ?? [];
      setRows(items.map((item: Record<string, unknown>) => toRow(resourceKey, item)));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể tải dữ liệu"); }
    finally { setLoading(false); }
  }, [query, resourceKey, status]);
  useEffect(() => { const timer = setTimeout(() => void load(), 200); return () => clearTimeout(timer); }, [load]);
  const statuses = useMemo(() => [...new Set(rows.map((row) => row.rawStatus))], [rows]);
  const shown = status === "ALL" ? rows : rows.filter((row) => row.rawStatus === status);
  const mutate = async () => {
    if (!selected) return;
    let body: Record<string, unknown>;
    if (resourceKey === "customers") body = { status: selected.rawStatus === "BLOCKED" ? "ACTIVE" : "BLOCKED" };
    else if (resourceKey === "reviews") body = { status: selected.rawStatus === "APPROVED" ? "REJECTED" : "APPROVED" };
    else if (resourceKey === "categories") body = { active: selected.rawStatus !== "true" };
    else body = { status: selected.rawStatus === "PUBLISHED" ? "ARCHIVED" : "PUBLISHED" };
    const response = await fetch(`/api/admin/${resourceKey}/${selected.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error?.message ?? "Không thể cập nhật"); return; }
    setSelected(null); await load();
  };
  const create = async () => {
    const body = resourceKey === "categories" ? { name, slug, active: true } : { title: name, slug, type: contentType };
    const response = await fetch(`/api/admin/${resourceKey}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error?.message ?? "Không thể tạo mới"); return; }
    setCreating(false); setName(""); setSlug(""); await load();
  };
  const canCreate = resourceKey === "categories" || resourceKey === "content";
  return <section aria-labelledby={`${resourceKey}-title`} data-testid={`admin-${resourceKey}-page`}>
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">An An Backoffice</p><h1 id={`${resourceKey}-title`} className="mt-1 text-2xl font-semibold sm:text-3xl">{resource.title}</h1><p className="mt-2 text-sm text-slate-600">{resource.description}</p></div>{canCreate && <button type="button" onClick={() => setCreating(true)} className="min-h-11 rounded-xl bg-[#173c32] px-5 text-sm font-semibold text-white" data-testid={`${resourceKey}-create`}>+ {resource.createLabel}</button>}</div>
    <div className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_220px]"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm kiếm…" aria-label={`Tìm trong ${resource.title}`} className="min-h-11 rounded-xl border border-slate-300 px-4" data-testid={`${resourceKey}-search`} /><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Lọc theo trạng thái" className="min-h-11 rounded-xl border border-slate-300 bg-white px-3" data-testid={`${resourceKey}-status-filter`}><option value="ALL">Tất cả</option>{statuses.map((value) => <option value={value} key={value}>{statusLabel(value)}</option>)}</select></div>
    {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}<button type="button" onClick={() => void load()} className="ml-2 font-semibold underline">Thử lại</button></div>}
    {loading ? <div role="status" className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">Đang tải dữ liệu…</div> : shown.length ? <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{resource.headers.map((header) => <th className="px-5 py-3" key={header}>{header}</th>)}<th className="px-5 py-3">Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr></thead><tbody className="divide-y divide-slate-100">{shown.map((row) => <tr key={row.id}>{row.cells.map((cell, index) => <td className="px-5 py-4" key={index}>{cell}</td>)}<td className="px-5 py-4">{row.status}</td><td className="px-5 py-4 text-right"><button type="button" onClick={() => setSelected(row)} className="min-h-10 px-3 font-semibold text-emerald-800">Chi tiết</button></td></tr>)}</tbody></table></div> : <div role="status" className="rounded-2xl border border-slate-200 bg-white p-10 text-center">Chưa có dữ liệu phù hợp.</div>}
    <AccessibleDialog open={Boolean(selected)} title="Chi tiết" onClose={() => setSelected(null)} footer={<><button type="button" onClick={() => void mutate()} className="min-h-11 rounded-xl bg-[#173c32] px-5 font-semibold text-white">{resourceKey === "customers" ? (selected?.rawStatus === "BLOCKED" ? "Mở khóa" : "Khóa tài khoản") : resourceKey === "reviews" ? (selected?.rawStatus === "APPROVED" ? "Ẩn đánh giá" : "Duyệt đánh giá") : resourceKey === "categories" ? (selected?.rawStatus === "true" ? "Ẩn danh mục" : "Hiển thị") : (selected?.rawStatus === "PUBLISHED" ? "Lưu trữ" : "Xuất bản")}</button><button type="button" onClick={() => setSelected(null)} className="min-h-11 rounded-xl border border-slate-300 px-5 font-semibold">Đóng</button></>}>{selected && <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200">{selected.detail.map(([label, value]) => <div className="p-4" key={label}><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>)}</dl>}</AccessibleDialog>
    <AccessibleDialog open={creating} title={resource.createLabel ?? "Tạo mới"} onClose={() => setCreating(false)} footer={<><button type="button" onClick={() => setCreating(false)} className="min-h-11 rounded-xl border border-slate-300 px-5 font-semibold">Hủy</button><button type="button" onClick={() => void create()} disabled={!name.trim() || !slug.trim()} className="min-h-11 rounded-xl bg-[#173c32] px-5 font-semibold text-white disabled:opacity-50">Lưu</button></>}><div className="space-y-4"><label className="block text-sm font-medium">Tên / tiêu đề<input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" /></label><label className="block text-sm font-medium">Slug<input value={slug} onChange={(event) => setSlug(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" /></label>{resourceKey === "content" && <label className="block text-sm font-medium">Loại<select value={contentType} onChange={(event) => setContentType(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3"><option value="BANNER">Banner</option><option value="ARTICLE">Bài viết</option><option value="PAGE">Trang</option></select></label>}</div></AccessibleDialog>
  </section>;
}
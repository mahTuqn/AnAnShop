"use client";

import { useMemo, useState } from "react";

type OperationKind = "returns" | "staff" | "access";
type OperationRow = { id: string; primary: string; secondary: string; meta: string; status: string };

const configurations: Record<OperationKind, { title: string; description: string; action: string; headers: string[]; statuses: string[]; rows: OperationRow[] }> = {
  returns: {
    title: "Đổi trả & hoàn tiền", description: "Duyệt yêu cầu, tiếp nhận hàng và hoàn tiền theo đúng giao dịch gốc.", action: "Tạo yêu cầu", headers: ["Yêu cầu", "Đơn hàng / khách", "Giá trị"], statuses: ["Chờ duyệt", "Đã duyệt", "Đã nhận hàng", "Đã hoàn tiền", "Từ chối"],
    rows: [
      { id: "RET-26082801", primary: "#RET-26082801", secondary: "#AN26082609 · Trần Ngọc Mai", meta: "219.000 ₫", status: "Chờ duyệt" },
      { id: "RET-26082703", primary: "#RET-26082703", secondary: "#AN26082402 · Lê Thu Trang", meta: "428.000 ₫", status: "Đã nhận hàng" },
    ],
  },
  staff: {
    title: "Nhân viên", description: "Quản lý tài khoản nội bộ và phạm vi truy cập backoffice.", action: "Mời nhân viên", headers: ["Nhân viên", "Email", "Vai trò"], statuses: ["Hoạt động", "Chờ nhận lời", "Đã khóa"],
    rows: [
      { id: "staff-admin", primary: "An An Admin", secondary: "admin@ananshop.vn", meta: "Chủ cửa hàng", status: "Hoạt động" },
      { id: "staff-orders", primary: "Thu Nguyễn", secondary: "thu@ananshop.vn", meta: "Xử lý đơn", status: "Hoạt động" },
      { id: "staff-invite", primary: "Mai Trần", secondary: "mai@ananshop.vn", meta: "CSKH", status: "Chờ nhận lời" },
    ],
  },
  access: {
    title: "Vai trò & quyền", description: "Thiết lập quyền tối thiểu theo từng nhóm công việc.", action: "Tạo vai trò", headers: ["Vai trò", "Mô tả", "Số quyền"], statuses: ["Vai trò hệ thống", "Tùy chỉnh"],
    rows: [
      { id: "OWNER", primary: "Chủ cửa hàng", secondary: "Toàn quyền vận hành", meta: "28 quyền", status: "Vai trò hệ thống" },
      { id: "ORDER_STAFF", primary: "Xử lý đơn", secondary: "Đơn hàng, giao vận và khách hàng", meta: "9 quyền", status: "Tùy chỉnh" },
      { id: "WAREHOUSE", primary: "Nhân viên kho", secondary: "Tồn kho và giao vận", meta: "6 quyền", status: "Tùy chỉnh" },
    ],
  },
};

export function P0OperationsPage({ kind }: { kind: OperationKind }) {
  const config = configurations[kind];
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Tất cả");
  const [selected, setSelected] = useState<OperationRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const rows = useMemo(() => config.rows.filter((row) => [row.primary, row.secondary, row.meta, row.status].join(" ").toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi")) && (status === "Tất cả" || row.status === status)), [config.rows, query, status]);
  return <section aria-labelledby={`${kind}-title`} data-testid={`admin-${kind}-page`}>
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Kiểm soát vận hành</p><h1 id={`${kind}-title`} className="mt-1 text-2xl font-semibold sm:text-3xl">{config.title}</h1><p className="mt-2 text-sm text-slate-600">{config.description}</p></div><button type="button" onClick={() => setFormOpen(true)} className="min-h-11 rounded-xl bg-[#173c32] px-5 text-sm font-semibold text-white" data-testid={`${kind}-create`}>+ {config.action}</button></div>
    <div className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_220px]"><label><span className="sr-only">Tìm kiếm</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm kiếm…" className="min-h-11 w-full rounded-xl border border-slate-300 px-4" data-testid={`${kind}-search`} /></label><label><span className="sr-only">Lọc trạng thái</span><select value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3" data-testid={`${kind}-status-filter`}><option>Tất cả</option>{config.statuses.map((item) => <option key={item}>{item}</option>)}</select></label></div>
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{config.headers.map((header) => <th key={header} className="px-5 py-3">{header}</th>)}<th className="px-5 py-3">Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id}><td className="px-5 py-4 font-semibold">{row.primary}</td><td className="px-5 py-4 text-slate-600">{row.secondary}</td><td className="px-5 py-4 text-slate-600">{row.meta}</td><td className="px-5 py-4"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">{row.status}</span></td><td className="px-5 py-4 text-right"><button type="button" onClick={() => setSelected(row)} className="min-h-10 rounded-lg px-3 font-semibold text-emerald-800" aria-label={`Xem chi tiết ${row.primary}`}>Chi tiết</button></td></tr>)}</tbody></table>{!rows.length && <p role="status" className="p-12 text-center text-sm text-slate-500">Không tìm thấy dữ liệu phù hợp.</p>}</div>
    {selected && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"><section role="dialog" aria-modal="true" aria-label="Chi tiết vận hành" className="w-full max-w-lg rounded-2xl bg-white p-6"><div className="flex justify-between gap-4"><div><p className="text-xs uppercase tracking-wider text-emerald-700">Chi tiết</p><h2 className="mt-1 text-xl font-semibold">{selected.primary}</h2></div><button type="button" onClick={() => setSelected(null)} aria-label="Đóng chi tiết" className="h-11 w-11 rounded-xl border border-slate-200 text-xl">×</button></div><dl className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200"><div className="p-4"><dt className="text-xs text-slate-500">Thông tin</dt><dd className="mt-1 font-medium">{selected.secondary}</dd></div><div className="p-4"><dt className="text-xs text-slate-500">Phạm vi / giá trị</dt><dd className="mt-1 font-medium">{selected.meta}</dd></div><div className="p-4"><dt className="text-xs text-slate-500">Trạng thái</dt><dd className="mt-1 font-medium">{selected.status}</dd></div></dl><button type="button" className="mt-6 min-h-11 rounded-xl bg-[#173c32] px-5 text-sm font-semibold text-white">Cập nhật</button></section></div>}
    {formOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"><form onSubmit={(event) => { event.preventDefault(); setFormOpen(false); }} role="dialog" aria-modal="true" aria-label={config.action} className="w-full max-w-lg rounded-2xl bg-white p-6"><div className="flex justify-between"><h2 className="text-xl font-semibold">{config.action}</h2><button type="button" onClick={() => setFormOpen(false)} aria-label="Đóng biểu mẫu" className="h-11 w-11 rounded-xl border border-slate-200 text-xl">×</button></div><div className="mt-5 space-y-4"><label className="block text-sm font-medium">Tên / mã<input required className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3" /></label><label className="block text-sm font-medium">Ghi chú<textarea rows={4} className="mt-1.5 w-full rounded-xl border border-slate-300 p-3" /></label></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setFormOpen(false)} className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-semibold">Hủy</button><button type="submit" className="min-h-11 rounded-xl bg-[#173c32] px-5 text-sm font-semibold text-white">Lưu</button></div></form></div>}
  </section>;
}

"use client";

import { useMemo, useState } from "react";
import { AccessibleDialog } from "./accessible-dialog";

type OperationKind = "returns" | "staff" | "access";
type OperationRow = { id: string; primary: string; secondary: string; meta: string; status: string };
type Configuration = { title: string; description: string; action: string; headers: string[]; statuses: string[]; rows: OperationRow[] };

const configurations: Record<OperationKind, Configuration> = {
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

export function P0OperationsPageV2({ kind }: { kind: OperationKind }) {
  const config = configurations[kind];
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Tất cả");
  const [selected, setSelected] = useState<OperationRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const rows = useMemo(() => config.rows.filter((row) => [row.primary, row.secondary, row.meta, row.status].join(" ").toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi")) && (status === "Tất cả" || row.status === status)), [config.rows, query, status]);
  const closeDetail = () => setSelected(null);
  const closeForm = () => setFormOpen(false);

  return <section aria-labelledby={`${kind}-title`} data-testid={`admin-${kind}-page`}>
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">Kiểm soát vận hành</p><h1 id={`${kind}-title`} className="mt-1 text-2xl font-semibold sm:text-3xl">{config.title}</h1><p className="mt-2 text-sm text-slate-600">{config.description}</p></div><button type="button" onClick={() => setFormOpen(true)} className="min-h-11 rounded-xl bg-[#b06b75] px-5 text-sm font-semibold text-white" data-testid={`${kind}-create`}>+ {config.action}</button></div>
    <div className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_220px]"><label><span className="sr-only">Tìm kiếm</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm kiếm…" className="min-h-11 w-full rounded-xl border border-slate-300 px-4" data-testid={`${kind}-search`} /></label><label><span className="sr-only">Lọc trạng thái</span><select value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3" data-testid={`${kind}-status-filter`}><option>Tất cả</option>{config.statuses.map((item) => <option key={item}>{item}</option>)}</select></label></div>
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{config.headers.map((header) => <th scope="col" key={header} className="px-5 py-3">{header}</th>)}<th scope="col" className="px-5 py-3">Trạng thái</th><th scope="col"><span className="sr-only">Thao tác</span></th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id}><td className="px-5 py-4 font-semibold">{row.primary}</td><td className="px-5 py-4 text-slate-600">{row.secondary}</td><td className="px-5 py-4 text-slate-600">{row.meta}</td><td className="px-5 py-4"><span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-800">{row.status}</span></td><td className="px-5 py-4 text-right"><button type="button" onClick={() => setSelected(row)} className="min-h-10 rounded-lg px-3 font-semibold text-rose-800" aria-label={`Xem chi tiết ${row.primary}`}>Chi tiết</button></td></tr>)}</tbody></table>{!rows.length && <div role="status" className="p-12 text-center text-sm text-slate-500"><p>Không tìm thấy dữ liệu phù hợp.</p><button type="button" onClick={() => { setQuery(""); setStatus("Tất cả"); }} className="mt-4 min-h-11 rounded-xl px-4 font-semibold text-rose-800">Xóa bộ lọc</button></div>}</div>
    <AccessibleDialog open={Boolean(selected)} title="Chi tiết vận hành" onClose={closeDetail} footer={<><button type="button" className="min-h-11 rounded-xl bg-[#b06b75] px-5 text-sm font-semibold text-white">Cập nhật</button><button type="button" aria-label="Đóng chi tiết" onClick={closeDetail} className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-semibold">Đóng</button></>}>
      {selected && <><h3 className="font-semibold">{selected.primary}</h3><dl className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200"><div className="p-4"><dt className="text-xs text-slate-500">Thông tin</dt><dd className="mt-1 font-medium">{selected.secondary}</dd></div><div className="p-4"><dt className="text-xs text-slate-500">Phạm vi / giá trị</dt><dd className="mt-1 font-medium">{selected.meta}</dd></div><div className="p-4"><dt className="text-xs text-slate-500">Trạng thái</dt><dd className="mt-1 font-medium">{selected.status}</dd></div></dl></>}
    </AccessibleDialog>
    <AccessibleDialog open={formOpen} title={config.action} onClose={closeForm} footer={<><button type="button" onClick={closeForm} className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-semibold">Hủy</button><button type="submit" form={`${kind}-operation-form`} className="min-h-11 rounded-xl bg-[#b06b75] px-5 text-sm font-semibold text-white">Lưu</button></>}>
      <form id={`${kind}-operation-form`} onSubmit={(event) => { event.preventDefault(); closeForm(); }} className="space-y-4"><label className="block text-sm font-medium">Tên / mã<input required className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3" /></label><label className="block text-sm font-medium">Ghi chú<textarea rows={4} className="mt-1.5 w-full rounded-xl border border-slate-300 p-3" /></label></form>
    </AccessibleDialog>
  </section>;
}

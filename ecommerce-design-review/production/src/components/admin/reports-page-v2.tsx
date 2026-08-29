"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminAsyncState } from "./admin-async-state";
import { CsvExportButton } from "./csv-export-button";

type ReportType = "revenue" | "orders" | "products" | "inventory" | "customers";
type Report = { type: ReportType; days: number; generatedAt: string; columns: string[]; rows: Array<Record<string, unknown>> };
const labels: Record<ReportType, string> = { revenue: "Doanh thu", orders: "Đơn hàng", products: "Sản phẩm", inventory: "Tồn kho", customers: "Khách hàng" };
const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export function ReportsPageV2() {
  const [type, setType] = useState<ReportType>("revenue");
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch(`/api/admin/reports?type=${type}&days=${days}`, { credentials: "same-origin" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Không thể tải báo cáo");
      setReport(payload.data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể tải báo cáo"); }
    finally { setLoading(false); }
  }, [days, type]);
  useEffect(() => { void load(); }, [load]);
  const loadCsv = async () => {
    if (!report) throw new Error("Báo cáo chưa sẵn sàng");
    const body = [report.columns.map(csvCell).join(","), ...report.rows.map((row) => report.columns.map((column) => csvCell(row[column])).join(","))].join("\r\n");
    return new Blob(["\ufeff", body], { type: "text/csv;charset=utf-8" });
  };
  return <section aria-labelledby="reports-title" data-testid="admin-reports-page">
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">Phân tích kinh doanh</p><h1 id="reports-title" className="mt-1 text-2xl font-semibold sm:text-3xl">Báo cáo</h1><p className="mt-2 text-sm text-slate-600">Dữ liệu trực tiếp từ đơn hàng, sản phẩm, tồn kho và khách hàng.</p></div><div className="flex flex-wrap gap-3"><label className="text-sm font-medium">Loại<select value={type} onChange={(event) => setType(event.target.value as ReportType)} className="ml-2 min-h-11 rounded-xl border border-slate-300 bg-white px-3" data-testid="reports-type">{Object.entries(labels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="text-sm font-medium">Khoảng thời gian<select value={days} onChange={(event) => setDays(Number(event.target.value))} className="ml-2 min-h-11 rounded-xl border border-slate-300 bg-white px-3" data-testid="reports-period"><option value={7}>7 ngày qua</option><option value={30}>30 ngày qua</option><option value={90}>90 ngày qua</option><option value={365}>12 tháng qua</option></select></label></div></div>
    <AdminAsyncState loading={loading} error={error} empty={!loading && !error && !report?.rows.length} onRetry={() => void load()}>
      {report && <><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500">{report.rows.length.toLocaleString("vi-VN")} dòng · tạo lúc {new Date(report.generatedAt).toLocaleString("vi-VN")}</p><CsvExportButton fileName={`an-an-${report.type}-${report.days}-ngay.csv`} load={loadCsv} /></div><div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{report.columns.map((column) => <th className="px-4 py-3" key={column}>{column.replaceAll("_", " ")}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{report.rows.map((row, index) => <tr key={index}>{report.columns.map((column) => <td className="px-4 py-3" key={column}>{row[column] == null ? "—" : String(row[column])}</td>)}</tr>)}</tbody></table></div><p className="mt-4 text-xs text-slate-500">CSV được xuất trực tiếp từ dữ liệu đang hiển thị. Excel/PDF chỉ được bật khi có bộ sinh tệp chuẩn và kiểm thử định dạng.</p></>}
    </AdminAsyncState>
  </section>;
}
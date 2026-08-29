"use client";

import { useState } from "react";

/** The caller owns authenticated fetching; this component owns UX/download. */
export function CsvExportButton({ fileName, load }: { fileName: string; load: () => Promise<Blob> }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const exportCsv = async () => {
    setPending(true); setError("");
    try {
      const blob = await load();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = fileName; anchor.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể xuất báo cáo");
    } finally { setPending(false); }
  };
  return <div><button type="button" onClick={exportCsv} disabled={pending} className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold">{pending ? "Đang xuất…" : "Xuất báo cáo CSV"}</button>{error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}</div>;
}


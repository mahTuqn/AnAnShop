import type { ReactNode } from "react";

export function AdminAsyncState({ loading, error, empty, onRetry, children }: {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  onRetry?: () => void;
  children: ReactNode;
}) {
  if (loading) return <div role="status" aria-live="polite" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5"><div className="h-5 w-44 animate-pulse rounded bg-slate-200" /><div className="h-12 animate-pulse rounded-xl bg-slate-100" /><div className="h-12 animate-pulse rounded-xl bg-slate-100" /><span className="sr-only">Đang tải dữ liệu quản trị</span></div>;
  if (error) return <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6"><h2 className="font-semibold text-red-900">Không thể tải dữ liệu</h2><p className="mt-2 text-sm text-red-800">{error}</p>{onRetry && <button type="button" onClick={onRetry} className="mt-4 min-h-11 rounded-xl border border-red-300 bg-white px-4 text-sm font-semibold text-red-900">Thử lại</button>}</div>;
  if (empty) return <div role="status" className="rounded-2xl border border-slate-200 bg-white p-12 text-center"><h2 className="font-semibold">Chưa có dữ liệu</h2><p className="mt-2 text-sm text-slate-500">Dữ liệu mới sẽ xuất hiện tại đây.</p></div>;
  return children;
}


"use client";
import { AdminAsyncState } from "@/components/admin/admin-async-state";
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AdminAsyncState error={error.message || "Đã xảy ra lỗi khi tải khu vực quản trị."} onRetry={reset}>Error</AdminAsyncState>;
}


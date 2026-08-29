import Link from "next/link";

export function ProductEditorLink({ id, label }: { id: string; label: string }) {
  return <Link href={`/admin/products/${encodeURIComponent(id)}`} className="font-semibold text-rose-800 underline-offset-4 hover:underline focus:underline" aria-label={`Chỉnh sửa sản phẩm ${label}`}>{label}</Link>;
}

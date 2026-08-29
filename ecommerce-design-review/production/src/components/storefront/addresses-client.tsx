"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState, PageSkeleton } from "@/components/ui/states";
import { apiRequest } from "@/lib/storefront/api";

type Address = { id: string; label?: string | null; fullName: string; phone: string; province: string; district: string; ward: string; line1: string; postalCode?: string | null; isDefault: boolean };
const normalize = (value: Record<string, unknown>): Address => ({ id: String(value.id), label: value.label as string | null, fullName: String(value.fullName ?? value.full_name ?? ""), phone: String(value.phone ?? ""), province: String(value.province ?? ""), district: String(value.district ?? ""), ward: String(value.ward ?? ""), line1: String(value.line1 ?? ""), postalCode: (value.postalCode ?? value.postal_code) as string | null, isDefault: Boolean(value.isDefault ?? value.is_default) });

export function AddressesClient() {
  const [addresses, setAddresses] = useState<Address[] | null>(null); const [editing, setEditing] = useState<Address | null>(null); const [open, setOpen] = useState(false); const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  const load = () => apiRequest<Record<string, unknown>[]>("/api/account/addresses", { method: "GET" }).then((rows) => setAddresses(rows.map(normalize))).catch((reason) => { setError(reason instanceof Error ? reason.message : "Không thể tải địa chỉ."); setAddresses([]); });
  useEffect(() => { void load(); }, []);
  if (!addresses) return <PageSkeleton />;

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setPending(true); setError(""); const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(["label", "fullName", "phone", "province", "district", "ward", "line1", "postalCode"].map((key) => [key, form.get(key)])); Object.assign(body, { isDefault: form.get("isDefault") === "on" });
    try { await apiRequest(editing ? `/api/account/addresses/${editing.id}` : "/api/account/addresses", { method: editing ? "PATCH" : "POST", body: JSON.stringify(body) }); setOpen(false); setEditing(null); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể lưu địa chỉ."); }
    finally { setPending(false); }
  };
  const remove = async (id: string) => {
    if (!confirm("Xóa địa chỉ này?")) return; setPending(true); setError("");
    try { await apiRequest(`/api/account/addresses/${id}`, { method: "DELETE" }); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể xóa địa chỉ."); }
    finally { setPending(false); }
  };

  return <section><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="font-serif text-3xl">Sổ địa chỉ</h2><p className="mt-2 text-sm text-[#625853]">Lưu nhiều địa chỉ và chọn địa chỉ mặc định khi thanh toán.</p></div><Button onClick={() => { setEditing(null); setOpen(true); }}>Thêm địa chỉ</Button></div>
    {error && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">{error}</p>}
    {!addresses.length && !open ? <div className="mt-7"><EmptyState title="Chưa có địa chỉ đã lưu" description="Thêm địa chỉ để thanh toán nhanh và chính xác hơn." /></div> : <div className="mt-7 grid gap-4 sm:grid-cols-2">{addresses.map((address) => <article className="rounded-2xl border bg-white p-5" key={address.id}><div className="flex justify-between gap-3"><strong>{address.label || "Địa chỉ nhận hàng"}</strong>{address.isDefault && <span className="rounded-full bg-green-50 px-3 py-1 text-xs text-green-800">Mặc định</span>}</div><p className="mt-3 text-sm leading-6">{address.fullName} · {address.phone}<br />{address.line1}, {address.ward}, {address.district}, {address.province}</p><div className="mt-4 flex gap-4 text-sm"><button className="text-[#713c33] underline" onClick={() => { setEditing(address); setOpen(true); }}>Sửa</button><button className="text-red-700 underline" disabled={pending} onClick={() => void remove(address.id)}>Xóa</button></div></article>)}</div>}
    {open && <form onSubmit={save} className="mt-7 rounded-2xl border bg-white p-6"><h3 className="font-serif text-2xl">{editing ? "Sửa địa chỉ" : "Thêm địa chỉ"}</h3><div className="mt-5 grid gap-4 sm:grid-cols-2">{(["label", "fullName", "phone", "province", "district", "ward", "line1", "postalCode"] as const).map((name) => <label className={name === "line1" ? "sm:col-span-2" : ""} key={name}><span className="text-sm font-medium">{labels[name]}</span><input className="mt-2 w-full rounded-xl border px-4 py-3" name={name} defaultValue={editing?.[name] ?? ""} required={!["label", "postalCode"].includes(name)} /></label>)}</div><label className="mt-4 flex gap-3 text-sm"><input type="checkbox" name="isDefault" defaultChecked={editing?.isDefault ?? addresses.length === 0} />Đặt làm địa chỉ mặc định</label><div className="mt-6 flex gap-3"><Button disabled={pending}>{pending ? "Đang lưu…" : "Lưu địa chỉ"}</Button><button type="button" className="rounded-xl border px-5" onClick={() => { setOpen(false); setEditing(null); }}>Hủy</button></div></form>}
  </section>;
}
const labels = { label: "Nhãn (Nhà/Công ty)", fullName: "Họ và tên *", phone: "Số điện thoại *", province: "Tỉnh/Thành phố *", district: "Quận/Huyện *", ward: "Phường/Xã *", line1: "Địa chỉ cụ thể *", postalCode: "Mã bưu chính" };

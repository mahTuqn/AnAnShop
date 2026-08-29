"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState, PageSkeleton } from "@/components/ui/states";
import { apiRequest, type ApiCart } from "@/lib/storefront/api";
import { money, products } from "@/lib/storefront/data";

const FREE_SHIPPING_THRESHOLD = 699_000;

export function CartClientIntegrated() {
  const [cart, setCart] = useState<ApiCart | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; freeShipping: boolean } | null>(null);
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState("");
  const selectionInitialized = useRef(false);

  const load = async () => {
    try {
      const next = await apiRequest<ApiCart>("/api/cart", { method: "GET" });
      setCart(next);
      setSelected((current) => {
        if (!selectionInitialized.current) { selectionInitialized.current = true; return new Set(next.items.map((item) => item.id)); }
        return new Set([...current].filter((id) => next.items.some((item) => item.id === id)));
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải giỏ hàng.");
      setCart({ items: [], subtotal: 0 });
    }
  };

  useEffect(() => { void load(); }, []);

  const selectedItems = useMemo(() => cart?.items.filter((item) => selected.has(item.id)) ?? [], [cart, selected]);
  const subtotal = selectedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const discount = appliedCoupon ? appliedCoupon.discount : 0;
  const shipping = selectedItems.length === 0 || subtotal >= FREE_SHIPPING_THRESHOLD || appliedCoupon?.freeShipping ? 0 : 30_000;

  const handleApplyCoupon = async () => {
    if (!coupon.trim()) return;
    setPendingId("coupon");
    try {
      const selectedIds = selectedItems.map(i => i.id).join(',');
      const res = await apiRequest<{ discount: number; freeShipping: boolean; code: string }>(`/api/cart/coupon?code=${encodeURIComponent(coupon)}${selectedIds ? `&items=${selectedIds}` : ''}`);
      setAppliedCoupon({ ...res, code: coupon.trim().toUpperCase() });
      setError("");
    } catch (reason) {
      setAppliedCoupon(null);
      setError(reason instanceof Error ? reason.message : "Mã ưu đãi không hợp lệ.");
    } finally {
      setPendingId("");
    }
  };

  const mutate = async (itemId: string, operation: () => Promise<unknown>) => {
    setPendingId(itemId); setError("");
    try { await operation(); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể cập nhật giỏ hàng."); }
    finally { setPendingId(""); }
  };

  if (!cart) return <PageSkeleton />;
  if (!cart.items.length) return <div data-testid="cart-empty">{error && <Alert>{error}</Alert>}<EmptyState title="Giỏ hàng đang trống" description="Mẹ chưa thêm sản phẩm nào. Hãy khám phá những thiết kế dịu dàng của An An nhé." actionHref="/products" action="Khám phá sản phẩm" /></div>;

  const allSelected = selected.size === cart.items.length;
  return <div className="grid gap-10 lg:grid-cols-[1fr_380px]" data-testid="cart-lines">
    <section>
      {error && <Alert>{error}</Alert>}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-[#e4dad5] pb-4 text-sm">
        <label className="flex items-center gap-3"><input type="checkbox" checked={allSelected} onChange={(event) => setSelected(event.target.checked ? new Set(cart.items.map((item) => item.id)) : new Set())} /> Chọn tất cả ({cart.items.length})</label>
        <button className="text-[#ce7a85] underline disabled:opacity-50" disabled={!selected.size || Boolean(pendingId)} onClick={() => void (async () => { setPendingId("bulk"); try { for (const item of selectedItems) await apiRequest(`/api/cart?itemId=${encodeURIComponent(item.id)}`, { method: "DELETE" }); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể xóa sản phẩm."); } finally { setPendingId(""); } })()}>Xóa mục đã chọn</button>
      </div>
      <div className="divide-y divide-[#e4dad5]">{cart.items.map((item) => {
        const fallback = products.find((product) => product.id === (item.product.id === "prd_maternity_dress" ? "prd_01" : "prd_03")) ?? products[0];
        return <article className="grid grid-cols-[24px_92px_1fr] gap-4 py-6 sm:grid-cols-[24px_120px_1fr_auto]" key={item.id}>
          <input aria-label={`Chọn ${item.product.name}`} type="checkbox" checked={selected.has(item.id)} onChange={(event) => setSelected((current) => { const next = new Set(current); event.target.checked ? next.add(item.id) : next.delete(item.id); return next; })} />
          <img className="aspect-[4/5] w-full rounded-2xl object-cover" src={item.product.imageUrl || fallback.image} alt={item.product.name} />
          <div><h2 className="font-semibold">{item.product.name}</h2><p className="mt-1 text-sm text-[#776b65]">{item.variantName}</p><strong className="mt-2 block">{money(item.unitPrice)}</strong>
            <div className="mt-4 flex items-center gap-2"><button aria-label="Giảm số lượng" className="size-10 rounded-lg border" disabled={pendingId === item.id || item.quantity <= 1} onClick={() => void mutate(item.id, () => apiRequest("/api/cart", { method: "PATCH", body: JSON.stringify({ itemId: item.id, quantity: item.quantity - 1 }) }))}>−</button><span className="min-w-8 text-center" aria-live="polite">{item.quantity}</span><button aria-label="Tăng số lượng" className="size-10 rounded-lg border" disabled={pendingId === item.id} onClick={() => void mutate(item.id, () => apiRequest("/api/cart", { method: "PATCH", body: JSON.stringify({ itemId: item.id, quantity: item.quantity + 1 }) }))}>+</button></div>
          </div>
          <div className="col-start-3 text-right sm:col-start-auto"><strong>{money(item.lineTotal)}</strong><button className="mt-3 block text-sm text-[#ce7a85] underline" disabled={pendingId === item.id} onClick={() => void mutate(item.id, () => apiRequest(`/api/cart?itemId=${encodeURIComponent(item.id)}`, { method: "DELETE" }))}>Xóa</button></div>
        </article>;
      })}</div>
    </section>
    <aside className="h-fit rounded-3xl bg-white p-6 shadow-sm lg:sticky lg:top-24"><h2 className="font-serif text-2xl">Tóm tắt đơn hàng</h2>
      <label className="mt-6 block text-sm font-medium">Mã ưu đãi<div className="mt-2 flex gap-2"><input className="min-w-0 flex-1 rounded-xl border px-3 py-2 uppercase" value={coupon} onChange={(event) => setCoupon(event.target.value)} /><Button type="button" className="shrink-0" onClick={handleApplyCoupon} disabled={pendingId === "coupon"}>Áp dụng</Button></div></label>
      {appliedCoupon ? <p className="mt-2 text-xs text-green-700" role="status">Đã áp dụng mã {appliedCoupon.code} thành công!</p> : coupon && <p className="mt-2 text-xs text-[#776b65]" role="status">Nhập mã ưu đãi để xem số tiền giảm.</p>}
      <dl className="mt-6 space-y-4 text-sm"><div className="flex justify-between"><dt>Đã chọn</dt><dd>{selectedItems.length} sản phẩm</dd></div><div className="flex justify-between"><dt>Tạm tính</dt><dd>{money(subtotal)}</dd></div>{discount > 0 && <div className="flex justify-between text-green-700"><dt>Ưu đãi</dt><dd>−{money(Math.min(discount, subtotal))}</dd></div>}<div className="flex justify-between"><dt>Vận chuyển</dt><dd>{shipping ? money(shipping) : selectedItems.length ? "Miễn phí" : "—"}</dd></div><div className="flex justify-between border-t pt-4 text-base font-semibold"><dt>Tổng dự kiến</dt><dd>{money(Math.max(0, subtotal + shipping - Math.min(discount, subtotal)))}</dd></div></dl>
      {selectedItems.length > 0 ? <ButtonLink href={`/checkout?items=${selectedItems.map(i => i.id).join(',')}${appliedCoupon ? `&coupon=${encodeURIComponent(appliedCoupon.code)}` : ""}`} className="mt-6 w-full">Tiến hành thanh toán</ButtonLink> : <p className="mt-6 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Vui lòng chọn ít nhất 1 sản phẩm để thanh toán.</p>}
      <p className="mt-4 text-center text-xs text-[#776b65]">Giá, tồn kho và ưu đãi được xác nhận lại tại máy chủ.</p>
    </aside>
  </div>;
}

function Alert({ children }: { children: React.ReactNode }) { return <p className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">{children}</p>; }

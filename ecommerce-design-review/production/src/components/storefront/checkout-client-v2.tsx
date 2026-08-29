"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/button";
import { PageSkeleton } from "@/components/ui/states";
import { apiRequest, type ApiCart, type ApiCheckout } from "@/lib/storefront/api";
import { money } from "@/lib/storefront/data";

type Address = { fullName: string; phone: string; email: string; province: string; district: string; ward: string; line1: string };
const initialAddress: Address = { fullName: "", phone: "", email: "", province: "", district: "", ward: "", line1: "" };
type SavedAddress = Address & { id: string; label?: string; isDefault: boolean };

export function CheckoutClientV2() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cart, setCart] = useState<ApiCart | null>(null);
  const [loadError, setLoadError] = useState("");
  const [step, setStep] = useState(1);
  const [payment, setPayment] = useState("COD");
  const shipping = "STANDARD";
  const [customerNote, setCustomerNote] = useState("");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [address, setAddress] = useState(initialAddress);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const couponParam = searchParams.get("coupon")?.trim().toUpperCase() || undefined;
  const [couponInput, setCouponInput] = useState(couponParam ?? "");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; freeShipping: boolean } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState("");
  const couponCode = appliedCoupon?.code;
  const itemsParam = searchParams.get("items")?.split(",") || [];
  const checkoutItems = useMemo(() => cart ? (itemsParam.length ? cart.items.filter(i => itemsParam.includes(i.id)) : cart.items) : [], [cart, itemsParam.join(",")]);
  const subtotal = useMemo(() => checkoutItems.reduce((sum, item) => sum + item.lineTotal, 0), [checkoutItems]);
  const shipFee = subtotal >= 699000 || appliedCoupon?.freeShipping ? 0 : 30000;
  const discount = Math.min(appliedCoupon ? appliedCoupon.discount : 0, subtotal);
  const grandTotal = Math.max(0, subtotal + shipFee - discount);
  const buyNowParam = searchParams.get("buyNow");
  const qtyParam = searchParams.get("qty") || "1";

  useEffect(() => {
    if (buyNowParam) {
      apiRequest<ApiCart>(`/api/checkout/preview?variantId=${buyNowParam}&qty=${qtyParam}`, { method: "GET" }).then(setCart).catch((reason) => { setLoadError(reason instanceof Error ? reason.message : "Không thể tải sản phẩm mua ngay."); setCart({ items: [], subtotal: 0 }); });
    } else {
      apiRequest<ApiCart>("/api/cart", { method: "GET" }).then(setCart).catch((reason) => { setLoadError(reason instanceof Error ? reason.message : "Không thể tải giỏ hàng."); setCart({ items: [], subtotal: 0 }); });
    }
    apiRequest<{ email: string; fullName: string }>("/api/account/profile", { method: "GET" }).then((profile) => setAddress((current) => ({ ...current, email: profile.email, fullName: current.fullName || profile.fullName }))).catch(() => undefined);
    apiRequest<Record<string, unknown>[]>("/api/account/addresses", { method: "GET" }).then((rows) => {
      const mapped = rows.map((row) => ({ id: String(row.id), label: String(row.label ?? ""), fullName: String(row.fullName ?? row.full_name ?? ""), phone: String(row.phone ?? ""), email: "", province: String(row.province ?? ""), district: String(row.district ?? ""), ward: String(row.ward ?? ""), line1: String(row.line1 ?? ""), isDefault: Boolean(row.isDefault ?? row.is_default) }));
      setSavedAddresses(mapped); const preferred = mapped.find((item) => item.isDefault) ?? mapped[0]; if (preferred) setAddress((current) => ({ ...preferred, email: current.email }));
    }).catch(() => undefined);
  }, [buyNowParam, qtyParam]);
  const itemCount = useMemo(() => checkoutItems.reduce((sum, item) => sum + item.quantity, 0), [checkoutItems]);

  const handleApplyCoupon = async (codeToApply: string) => {
    if (!codeToApply.trim()) return;
    setValidatingCoupon(true);
    try {
      const selectedIds = itemsParam.join(',');
      const buyNowQuery = buyNowParam ? `&buyNowVariantId=${buyNowParam}&buyNowQty=${qtyParam}` : '';
      const res = await apiRequest<{ discount: number; freeShipping: boolean; code: string }>(`/api/cart/coupon?code=${encodeURIComponent(codeToApply)}${selectedIds ? `&items=${selectedIds}` : ''}${buyNowQuery}`);
      setAppliedCoupon({ ...res, code: codeToApply.trim().toUpperCase() });
      setCouponError("");
    } catch (reason) {
      setAppliedCoupon(null);
      setCouponError(reason instanceof Error ? reason.message : "Mã ưu đãi không hợp lệ.");
    } finally {
      setValidatingCoupon(false);
    }
  };

  useEffect(() => {
    if (couponParam) { void handleApplyCoupon(couponParam); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addressNext = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); setAddress({ fullName: String(form.get("fullName")), phone: String(form.get("phone")), email: String(form.get("email")), province: String(form.get("province")), district: String(form.get("district")), ward: String(form.get("ward")), line1: String(form.get("line1")) }); setStep(2); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const checkout = () => apiRequest<ApiCheckout>("/api/checkout", { method: "POST", headers: { "idempotency-key": sessionStorage.getItem("anan_checkout_key") ?? createKey() }, body: JSON.stringify({ paymentMethod: payment, shippingMethod: shipping, customerNote: customerNote || undefined, couponCode: appliedCoupon?.code, shippingAddress: address, itemIds: itemsParam.length ? itemsParam : undefined, directItems: buyNowParam ? [{ variantId: buyNowParam, quantity: Number(qtyParam) }] : undefined }) });
  const finish = async () => { if (!terms) { setError("Mẹ vui lòng đồng ý với điều khoản mua hàng."); return; } setPending(true); setError(""); try { const result = await checkout(); sessionStorage.removeItem("anan_checkout_key"); sessionStorage.setItem(`anan_order_${result.order.code}`, JSON.stringify(result.order)); router.push(`/checkout/success?code=${encodeURIComponent(result.order.code)}`); } catch (reason) { setError(reason instanceof Error ? reason.message : "Thanh toán chưa hoàn tất."); } finally { setPending(false); } };

  if (!cart) return <PageSkeleton/>;
  if (!cart.items.length) return <section className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-sm" data-testid="checkout-empty"><h1 className="font-serif text-3xl">Giỏ hàng chưa có sản phẩm</h1><p className="mt-3 text-[#6d625d]">{loadError || "Hãy thêm sản phẩm trước khi bắt đầu thanh toán."}</p><ButtonLink href="/products" className="mt-6">Khám phá sản phẩm</ButtonLink></section>;

  return <div className="grid gap-10 lg:grid-cols-[1fr_380px]" data-testid="checkout-page"><div><ol className="mb-10 grid grid-cols-3 gap-2" aria-label="Tiến trình thanh toán">{["Thông tin", "Vận chuyển", "Thanh toán"].map((label, index) => <li className={`border-t-2 pt-3 text-sm ${step >= index + 1 ? "border-[#713c33] font-semibold text-[#713c33]" : "border-[#d9d0cb] text-[#706763]"}`} aria-current={step === index + 1 ? "step" : undefined} key={label}>{index + 1}. {label}</li>)}</ol>
    {step === 1 && <form onSubmit={addressNext} data-testid="checkout-address-form"><h1 className="font-serif text-3xl">Thông tin nhận hàng</h1>{savedAddresses.length > 0 && <label className="mt-6 block text-sm font-medium">Địa chỉ đã lưu<select className="mt-2 w-full rounded-xl border px-4 py-3" value={savedAddresses.find((item) => item.line1 === address.line1)?.id ?? ""} onChange={(event) => { const selected = savedAddresses.find((item) => item.id === event.target.value); if (selected) setAddress((current) => ({ ...selected, email: current.email })); }}><option value="">Nhập địa chỉ khác</option>{savedAddresses.map((item) => <option key={item.id} value={item.id}>{item.label || "Địa chỉ"} — {item.line1}</option>)}</select></label>}<div className="mt-7 grid gap-5 sm:grid-cols-2"><Field label="Họ và tên" name="fullName" value={address.fullName}/><Field label="Số điện thoại" name="phone" type="tel" inputMode="tel" pattern="[0-9 +()-]{9,15}" value={address.phone}/><Field label="Email" name="email" type="email" value={address.email}/><Field label="Tỉnh / Thành phố" name="province" value={address.province}/><Field label="Quận / Huyện" name="district" value={address.district}/><Field label="Phường / Xã" name="ward" value={address.ward}/><div className="sm:col-span-2"><Field label="Địa chỉ cụ thể" name="line1" value={address.line1}/></div></div><Button className="mt-8" data-testid="checkout-next">Tiếp tục đến vận chuyển</Button></form>}
    {step === 2 && <section data-testid="checkout-shipping"><h1 className="font-serif text-3xl">Phương thức vận chuyển</h1><div className="mt-7 space-y-3">{[["standard", "Giao hàng tiêu chuẩn", "2–4 ngày", cart.subtotal >= 699000 ? 0 : 30000]].map(([value, label, copy, price]) => <label className="flex cursor-pointer gap-4 rounded-2xl border border-[#713c33] bg-[#fffaf7] p-5" key={String(value)}><input type="radio" name="shipping" checked readOnly/><span className="flex-1"><strong>{label}</strong><span className="block text-sm text-[#6d625d]">{copy}</span></span><strong>{Number(price) ? money(Number(price)) : "Miễn phí"}</strong></label>)}<p className="mt-3 text-sm text-[#6d625d]">Giao hàng nhanh đang được hoàn thiện và sẽ sớm khả dụng.</p></div><div className="mt-8 flex flex-wrap gap-3"><Button type="button" className="border bg-white text-[#713c33]" onClick={() => setStep(1)}>Quay lại</Button><Button onClick={() => setStep(3)} data-testid="checkout-next">Tiếp tục thanh toán</Button></div></section>}
    {step === 3 && <section data-testid="checkout-payment"><h1 className="font-serif text-3xl">Thanh toán</h1><div className="mt-7 space-y-3">{[{ value: "COD", label: "Thanh toán khi nhận hàng", enabled: true }, { value: "MOMO", label: "Ví MoMo", enabled: false }, { value: "VNPAY", label: "VNPay", enabled: false }].map((option) => <label className={`flex gap-4 rounded-2xl border p-5 ${option.enabled ? "cursor-pointer" : "cursor-not-allowed bg-[#f5f2f0] text-[#766c67]"} ${payment === option.value ? "border-[#713c33] bg-[#fffaf7]" : "border-[#d9d0cb]"}`} key={option.value}><input type="radio" name="payment" checked={payment === option.value} disabled={!option.enabled} onChange={() => setPayment(option.value)}/><strong>{option.label}{!option.enabled && <span className="ml-2 text-xs font-normal">Sắp ra mắt</span>}</strong></label>)}</div><label className="mt-6 block text-sm font-medium">Ghi chú cho đơn hàng<textarea className="mt-2 min-h-24 w-full rounded-xl border px-4 py-3" maxLength={1000} value={customerNote} onChange={(event) => setCustomerNote(event.target.value)} placeholder="Ví dụ: gọi trước khi giao" /></label><label className="mt-6 flex gap-3 text-sm"><input type="checkbox" checked={terms} onChange={(event) => setTerms(event.target.checked)}/><span>Tôi đồng ý với <a className="underline" href="/terms" target="_blank">điều khoản</a> và chính sách đổi trả.</span></label>{error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}<div className="mt-8 flex flex-wrap gap-3"><Button type="button" className="border bg-white text-[#713c33]" onClick={() => setStep(2)}>Quay lại</Button><Button disabled={pending} onClick={finish} data-testid="place-order">{pending ? "Đang đặt hàng…" : "Đặt hàng"}</Button></div></section>}
  </div><aside className="h-fit rounded-3xl bg-white p-6 shadow-sm" aria-label="Tóm tắt đơn hàng"><h2 className="font-serif text-2xl">Đơn hàng của mẹ</h2><p className="mt-2 text-sm text-[#6d625d]">{itemCount} sản phẩm</p><ul className="mt-5 space-y-4">{checkoutItems.map((item) => <li className="flex justify-between gap-3 text-sm" key={item.id}><span>{item.product.name} <span className="text-[#6d625d]">× {item.quantity}</span></span><strong>{money(item.lineTotal)}</strong></li>)}</ul>
    <label className="mt-6 block text-sm font-medium">Mã ưu đãi<div className="mt-2 flex gap-2"><input className="min-w-0 flex-1 rounded-xl border px-3 py-2 uppercase" value={couponInput} onChange={(event) => setCouponInput(event.target.value)} placeholder="Nhập mã ưu đãi..." /><Button type="button" className="shrink-0" onClick={() => void handleApplyCoupon(couponInput)} disabled={validatingCoupon}>Áp dụng</Button></div></label>
    {appliedCoupon ? <p className="mt-2 text-xs text-green-700" role="status">Đã áp dụng mã {appliedCoupon.code} thành công!</p> : couponError ? <p className="mt-2 text-xs text-red-700" role="status">{couponError}</p> : <p className="mt-2 text-xs text-[#776b65]" role="status">Nhập mã ưu đãi để xem số tiền giảm.</p>}
    <dl className="mt-5 space-y-3 border-t pt-5 text-sm"><div className="flex justify-between"><dt>Tạm tính</dt><dd>{money(subtotal)}</dd></div>{discount > 0 && <div className="flex justify-between text-green-700"><dt>Ưu đãi</dt><dd>−{money(discount)}</dd></div>}<div className="flex justify-between"><dt>Vận chuyển</dt><dd>{shipFee ? money(shipFee) : "Miễn phí"}</dd></div><div className="flex justify-between border-t pt-4 font-semibold text-lg"><dt>Tổng cộng</dt><dd className="text-[#713c33]">{money(grandTotal)}</dd></div></dl></aside></div>;
}

function createKey() { const key = `checkout_${crypto.randomUUID()}`; sessionStorage.setItem("anan_checkout_key", key); return key; }
function Field({ label, name, type = "text", value, ...props }: { label: string; name: string; type?: string; value: string } & React.InputHTMLAttributes<HTMLInputElement>) { const id = `checkout-${name}`; return <div><label className="block text-sm font-medium" htmlFor={id}>{label} *</label><input key={`${name}-${value}`} id={id} className="mt-2 w-full rounded-xl border border-[#bfb4ae] px-4 py-3" name={name} type={type} defaultValue={value} required {...props}/></div>; }

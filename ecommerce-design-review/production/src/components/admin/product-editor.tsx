"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Variant = { sku: string; size: string; color: string; price: string; active: boolean };

export function ProductEditor({ productId, initialData }: { productId: string; initialData?: any }) {
  const router = useRouter();
  
  const [variants, setVariants] = useState<Variant[]>(initialData?.variants || []);
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  
  const [name, setName] = useState(initialData?.name || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [shortDescription, setShortDescription] = useState(initialData?.shortDescription || "");
  const [status, setStatus] = useState(initialData?.status || "DRAFT");
  const [featured, setFeatured] = useState(initialData?.featured || false);
  
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages([...images, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name,
        slug,
        shortDescription,
        status,
        featured,
        variants: variants.map(v => ({ ...v, price: v.price.toString() })),
        images
      };

      const isNew = productId === "new";
      const res = await fetch(`/api/admin/products${isNew ? '' : `/${productId}`}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const error = await res.json();
        const errorMessage = typeof error.error === 'object' ? error.error.message : error.error;
        alert(errorMessage || "Có lỗi xảy ra khi lưu");
        return;
      }

      const { data } = await res.json();
      setSaved(true);
      
      if (isNew && data?.id) {
        router.push(`/admin/products/${data.id}`);
      } else {
        router.refresh();
      }
    } catch (e) {
      console.error(e);
      alert("Đã có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  };

  return <section aria-labelledby="product-editor-title" data-testid="admin-product-editor"><a href="/admin/products" className="mb-5 inline-flex min-h-10 items-center text-sm font-semibold text-rose-800">← Danh sách sản phẩm</a>{saved && <div role="status" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">Đã lưu sản phẩm thành công.</div>}<form onSubmit={handleSubmit}><div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">Sản phẩm</p><h1 id="product-editor-title" className="mt-1 text-2xl font-semibold sm:text-3xl">{productId === "new" ? "Thêm sản phẩm mới" : name}</h1></div><div className="flex gap-3"><button type="submit" disabled={saving} className="min-h-11 rounded-xl bg-[#b06b75] px-5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Đang lưu..." : "Lưu thay đổi"}</button></div></div><div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,.7fr)]"><div className="space-y-6"><fieldset className="rounded-2xl border border-slate-200 bg-white p-5"><legend className="px-2 font-semibold">Thông tin cơ bản</legend><div className="grid gap-4"><label className="text-sm font-medium">Tên sản phẩm<div className="mt-1"><input required value={name} onChange={e => setName(e.target.value)} className="control" /></div></label><label className="text-sm font-medium">Mô tả ngắn<div className="mt-1"><textarea rows={3} value={shortDescription} onChange={e => setShortDescription(e.target.value)} className="control p-3" /></div></label><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Slug (URL)<div className="mt-1"><input required value={slug} onChange={e => setSlug(e.target.value)} className="control" /></div></label></div></div></fieldset><fieldset className="rounded-2xl border border-slate-200 bg-white p-5"><legend className="px-2 font-semibold">Biến thể</legend><p className="mb-4 text-sm text-slate-500">SKU phải duy nhất.</p><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr>{["SKU", "Size", "Màu", "Giá (₫)", "Bán", ""].map((value) => <th key={value} className="px-2 py-3">{value}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{variants.map((variant, index) => <tr key={index}><td className="px-2 py-3 font-medium"><input value={variant.sku} onChange={(event) => setVariants((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, sku: event.target.value } : item))} className="w-full rounded-lg border border-slate-300 px-2 py-2" /></td><td className="px-2 py-3"><input value={variant.size} onChange={(event) => setVariants((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, size: event.target.value } : item))} className="w-16 rounded-lg border border-slate-300 px-2 py-2" /></td><td className="px-2 py-3"><input value={variant.color} onChange={(event) => setVariants((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, color: event.target.value } : item))} className="w-20 rounded-lg border border-slate-300 px-2 py-2" /></td><td className="px-2 py-3"><input aria-label={`Giá ${variant.sku}`} value={variant.price} onChange={(event) => setVariants((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, price: event.target.value } : item))} inputMode="numeric" className="w-24 rounded-lg border border-slate-300 px-2 py-2" /></td><td className="px-2 py-3"><input type="checkbox" checked={variant.active} onChange={(event) => setVariants((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, active: event.target.checked } : item))} aria-label={`Bật bán ${variant.sku}`} /></td><td className="px-2 py-3 text-right"><button type="button" onClick={() => setVariants(variants.filter((_, i) => i !== index))} className="text-rose-600">Xóa</button></td></tr>)}</tbody></table></div><button type="button" onClick={() => setVariants((items) => [...items, { sku: `SKU-${Date.now()}`, size: "M", color: "Mặc định", price: "0", active: true }])} className="mt-4 min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold">+ Thêm biến thể</button></fieldset></div><aside className="space-y-6"><fieldset className="rounded-2xl border border-slate-200 bg-white p-5"><legend className="px-2 font-semibold">Xuất bản</legend><label className="text-sm font-medium">Trạng thái<div className="mt-1"><select value={status} onChange={e => setStatus(e.target.value)} className="control bg-white"><option value="DRAFT">Bản nháp</option><option value="ACTIVE">Đang bán</option><option value="ARCHIVED">Lưu trữ (Ẩn khỏi giao diện)</option></select></div></label><label className="mt-4 flex items-center gap-3 text-sm"><input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} /> Sản phẩm nổi bật</label></fieldset><section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">Hình ảnh</h2><div className="mt-4 grid grid-cols-2 gap-3">{images.map((img, i) => <div key={i} className="relative aspect-square rounded-xl bg-slate-50 border"><img src={img} className="object-cover w-full h-full rounded-xl" /><button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-white/80 p-1 rounded-full text-xs text-rose-600">✕</button></div>)}<label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm font-semibold text-slate-500"><span className="pointer-events-none">+ Tải ảnh</span><input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} /></label></div></section></aside></div></form></section>;
}

"use client";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { money } from "@/lib/storefront/data";
import type { Product } from "@/lib/storefront/types";

export function ProductDetail({ product }: { product: Product }) {
  const [image, setImage] = useState(0); 
  const [size, setSize] = useState(""); 
  const [color, setColor] = useState(product.colors[0]?.name ?? ""); 
  const [quantity, setQuantity] = useState(1); 
  const [message, setMessage] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Animation state for main image
  const [imageFade, setImageFade] = useState(false);
  
  const handleImageChange = (index: number) => {
    if (index === image) return;
    setImageFade(true);
    setTimeout(() => {
      setImage(index);
      setImageFade(false);
    }, 200);
  };

  const validate = () => { 
    if (!size) { setMessage("Mẹ vui lòng chọn kích thước trước khi thêm vào giỏ."); return false; } 
    setMessage("Đã thêm sản phẩm vào giỏ hàng mẫu."); return true; 
  };
  
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12 lg:grid lg:grid-cols-[1.2fr_1fr] lg:gap-16">
      {/* Left Column: Images */}
      <section className="flex flex-col-reverse gap-4 lg:flex-row lg:gap-6">
        {/* Thumbnails */}
        <div className="flex shrink-0 gap-3 overflow-x-auto pb-2 scrollbar-hide lg:w-24 lg:flex-col lg:overflow-y-auto lg:pb-0">
          {product.images.map((src, index) => (
            <button 
              className={`relative size-20 shrink-0 overflow-hidden rounded-2xl border-2 transition-all duration-300 lg:size-24 ${image === index ? "scale-100 border-[#ce7a85] shadow-md" : "scale-95 border-transparent opacity-60 hover:scale-105 hover:opacity-100"}`} 
              onClick={() => handleImageChange(index)} 
              aria-label={`Xem ảnh ${index + 1}`} 
              key={src}
            >
              <img className="size-full object-cover" src={src} alt=""/>
              {image === index && <div className="absolute inset-0 bg-black/5" />}
            </button>
          ))}
        </div>
        
        {/* Main Image */}
        <div className="group relative w-full overflow-hidden rounded-3xl bg-[#faeff1] shadow-xl shadow-black/5 aspect-[3/4] sm:aspect-[4/5] lg:aspect-[3/4]">
          <img 
            className={`size-full object-cover transition-all duration-500 ease-out group-hover:scale-105 ${imageFade ? 'scale-95 blur-sm opacity-40' : 'scale-100 blur-0 opacity-100'}`} 
            src={product.images[image] ?? product.image} 
            alt={product.name}
          />
          {/* Mobile Favorite Button */}
          <div className="absolute right-4 top-4 z-10 lg:hidden">
             <button 
                onClick={() => setIsFavorite(!isFavorite)}
                className={`grid size-12 shrink-0 place-items-center rounded-full bg-white/80 backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 ${isFavorite ? 'border-red-200 text-red-500' : 'border-transparent text-gray-400'}`} 
                aria-label="Thêm vào yêu thích">
                <span className={`text-2xl transition-transform duration-300 ${isFavorite ? 'scale-110' : 'scale-100'}`}>{isFavorite ? '♥' : '♡'}</span>
             </button>
          </div>
        </div>
      </section>
      
      {/* Right Column: Details */}
      <section className="flex flex-col pt-6 lg:sticky lg:top-28 lg:self-start lg:pt-0">
        <p className="mb-3 text-xs font-bold uppercase tracking-[.25em] text-[#c26b77]">{product.categoryLabel}</p>
        
        <div className="flex items-start justify-between gap-5">
          <h1 className="font-serif text-3xl leading-[1.2] text-[#362a2a] md:text-5xl">{product.name}</h1>
          <button 
            onClick={() => setIsFavorite(!isFavorite)}
            className={`hidden shrink-0 place-items-center rounded-full border shadow-sm transition-all duration-300 hover:scale-110 hover:shadow-md active:scale-95 lg:grid lg:size-14 ${isFavorite ? 'border-red-200 bg-red-50 text-red-500' : 'bg-white text-gray-400 hover:bg-gray-50'}`} 
            aria-label="Thêm vào yêu thích">
            <span className={`text-3xl transition-transform duration-300 ${isFavorite ? 'scale-110' : 'scale-100'}`}>{isFavorite ? '♥' : '♡'}</span>
          </button>
        </div>
        
        <p className="mt-4 flex items-center text-sm text-[#6b5e5e]">
          <span className="mr-2 flex text-lg text-[#e6a847]">
            {'★'.repeat(Math.round(product.rating))}{'☆'.repeat(5 - Math.round(product.rating))}
          </span>
          {product.rating} <span className="mx-2">·</span> 
          <a href="#reviews" className="underline decoration-dashed underline-offset-4 transition-colors hover:text-[#ce7a85]">{product.reviewCount} đánh giá</a>
        </p>
        
        <div className="mt-6 flex items-baseline gap-4">
          <strong className="text-3xl font-bold tracking-tight text-[#ce7a85] md:text-4xl">{money(product.price)}</strong>
          {product.compareAtPrice && <del className="text-lg text-[#9b918c]">{money(product.compareAtPrice)}</del>}
        </div>
        
        <p className="mt-6 text-base leading-relaxed text-[#615454] opacity-90 md:text-lg">{product.description}</p>
        
        <div className="my-8 h-px w-full bg-gradient-to-r from-transparent via-[#f2e4e6] to-transparent" />
        
        <fieldset>
          <legend className="flex items-center gap-2 text-lg font-semibold">
            Màu sắc 
            <span className="inline-block rounded-md bg-[#fcf4f5] px-2 py-1 text-xs font-medium text-[#ce7a85] transition-all">
              {color}
            </span>
          </legend>
          <div className="mt-4 flex flex-wrap gap-4">
            {product.colors.map((item) => (
              <button 
                type="button" 
                className={`group relative size-12 rounded-full border-2 transition-all duration-300 hover:scale-110 active:scale-95 ${color === item.name ? "scale-110 border-transparent shadow-lg ring-2 ring-[#ce7a85] ring-offset-4" : "border-gray-200 hover:border-gray-300 hover:shadow-md"}`} 
                style={{ background: item.hex }} 
                onClick={() => setColor(item.name)} 
                aria-label={item.name} 
                key={item.name}
              >
                {color === item.name && (
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white drop-shadow-md">✓</span>
                )}
              </button>
            ))}
          </div>
        </fieldset>
        
        <fieldset className="mt-8">
          <div className="mb-4 flex items-baseline justify-between">
            <legend className="text-lg font-semibold">Kích thước</legend>
            <a href="#size-guide" className="text-sm font-medium text-[#ce7a85] underline decoration-[#ce7a85]/30 underline-offset-4 transition-all hover:decoration-[#ce7a85]">Hướng dẫn chọn size</a>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {product.sizes.map((item) => (
              <button 
                type="button" 
                className={`relative min-h-[3.5rem] overflow-hidden rounded-2xl border-2 text-sm font-medium transition-all duration-300 hover:-translate-y-1 hover:shadow-md active:translate-y-0 active:shadow-sm ${size === item.name ? "border-[#ce7a85] bg-[#fcf4f5] text-[#ce7a85] shadow-inner" : "border-[#f5e8ea] bg-white hover:border-[#cbbfba]"}`} 
                onClick={() => { setSize(item.name); setMessage(""); }} 
                key={item.name}
              >
                {item.name}
                {size === item.name && (
                  <span className="absolute right-0 top-0 h-8 w-8 rounded-bl-full bg-gradient-to-bl from-[#ce7a85] to-transparent opacity-10" />
                )}
              </button>
            ))}
          </div>
        </fieldset>
        
        <fieldset className="mt-8">
          <legend className="mb-4 text-lg font-semibold">Số lượng</legend>
          <div className="flex h-14 w-40 items-center overflow-hidden rounded-2xl border-2 border-[#f5e8ea] bg-white shadow-sm transition-all focus-within:border-[#ce7a85] focus-within:ring-4 focus-within:ring-[#ce7a85]/10 hover:border-[#cbbfba]">
            <button type="button" className="flex h-full w-12 items-center justify-center text-2xl text-[#c26b77] transition-colors hover:bg-[#fcf4f5] active:bg-[#f2e4e6]" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Giảm số lượng">-</button>
            <input type="number" min="1" max="99" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="h-full flex-1 border-none p-0 text-center text-lg font-bold text-[#4f4141] focus:ring-0" aria-label="Số lượng" />
            <button type="button" className="flex h-full w-12 items-center justify-center text-2xl text-[#c26b77] transition-colors hover:bg-[#fcf4f5] active:bg-[#f2e4e6]" onClick={() => setQuantity(quantity + 1)} aria-label="Tăng số lượng">+</button>
          </div>
        </fieldset>
        
        {message && (
          <div className={`mt-6 flex items-start gap-3 rounded-2xl border px-5 py-4 text-sm font-medium transition-all duration-500 ease-out ${message.startsWith("Đã") ? "border-rose-200 bg-rose-50 text-rose-800" : "border-red-200 bg-red-50 text-red-800"}`} role="status">
            <span className="mt-0.5 text-lg">{message.startsWith("Đã") ? "✓" : "!"}</span>
            <p className="leading-relaxed">{message}</p>
          </div>
        )}
        
        {/* Mobile sticky action bar / Desktop standard buttons */}
        <div className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-2 gap-4 border-t border-gray-200 bg-white/95 p-4 pb-safe backdrop-blur-xl shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] sm:relative sm:z-auto sm:mt-8 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
          <Button 
            className="group relative h-14 overflow-hidden rounded-2xl border-2 border-[#ce7a85] bg-transparent text-lg font-semibold text-[#ce7a85] transition-all duration-300 hover:bg-[#ce7a85] hover:text-white hover:shadow-[0_0_20px_rgba(113,60,51,0.3)] active:scale-95" 
            onClick={validate}
          >
            Thêm vào giỏ
          </Button>
          <ButtonLink 
            href={size ? `/checkout?buyNow=${product.sizes.find(s => s.name === size)?.variantId}&qty=${quantity}` : "#chon-size"} 
            className="group flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ce7a85] to-[#c26b77] text-lg font-semibold text-white shadow-xl shadow-[#ce7a85]/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#ce7a85]/30 active:translate-y-0 active:scale-95" 
          >
            Mua ngay
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </ButtonLink>
        </div>
        
        <div className="mt-10 rounded-3xl border border-[#f2e4e6]/50 bg-gradient-to-br from-[#faf8f7] to-[#f4eeea] p-6 sm:p-8 lg:mt-12">
          <ul className="grid gap-5 text-sm font-medium text-[#665a5a]">
            <li className="flex items-center gap-4 transition-transform hover:translate-x-1">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-lg text-[#ce7a85] shadow-sm">🚚</span>
              Giao trong 2–4 ngày làm việc
            </li>
            <li className="flex items-center gap-4 transition-transform hover:translate-x-1">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-lg text-[#ce7a85] shadow-sm">✨</span>
              Miễn phí vận chuyển từ 699.000đ
            </li>
            <li className="flex items-center gap-4 transition-transform hover:translate-x-1">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-lg text-[#ce7a85] shadow-sm">🔄</span>
              Hỗ trợ đổi size trong 14 ngày
            </li>
          </ul>
        </div>
        
        <div className="mt-10 divide-y divide-[#f2e4e6]" id="size-guide">
          <details open className="group py-5">
            <summary className="flex cursor-pointer items-center justify-between list-none text-lg font-semibold text-[#362a2a]">
              Chất liệu & bảo quản
              <span className="text-[#c26b77] transition-transform duration-300 group-open:rotate-180">↓</span>
            </summary>
            <div className="mt-4 rounded-2xl border border-[#faeff1] bg-white p-5 shadow-sm transition-all">
              <p className="text-sm leading-relaxed text-[#665a5a]">{product.material}. Giặt nhẹ bằng nước mát, phơi trong bóng râm. Tránh sử dụng chất tẩy rửa mạnh để giữ độ bền màu.</p>
            </div>
          </details>
          <details className="group py-5">
            <summary className="flex cursor-pointer items-center justify-between list-none text-lg font-semibold text-[#362a2a]">
              Giai đoạn phù hợp
              <span className="text-[#c26b77] transition-transform duration-300 group-open:rotate-180">↓</span>
            </summary>
            <div className="mt-4 rounded-2xl border border-[#faeff1] bg-white p-5 shadow-sm transition-all">
              <p className="text-sm leading-relaxed text-[#665a5a]">{product.stage}. Thiết kế form dáng thoải mái, dễ dàng vận động. Nếu số đo của mẹ nằm giữa hai size, mẹ ưu tiên chọn size lớn hơn để có trải nghiệm tốt nhất nhé.</p>
            </div>
          </details>
        </div>
      </section>
    </div>
  );
}

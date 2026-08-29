"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { categoryLabels } from "@/lib/storefront/data";

export function SiteHeader() {
  const pathname = usePathname();
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => { setMenuOpen(false); setSearchOpen(false); }, [pathname]);

  return <>
    <a className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3" href="#main-content">Bỏ qua điều hướng</a>
    <header className="sticky top-0 z-30 border-b border-[#f0e1e3] bg-[#fffcfc]/95 backdrop-blur">
      <div className="mx-auto flex min-h-18 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <button type="button" className="grid size-11 place-items-center rounded-full hover:bg-[#fcf4f5] lg:hidden" aria-expanded={menuOpen} aria-controls={menuId} aria-label={menuOpen ? "Đóng menu" : "Mở menu"} onClick={() => setMenuOpen((value) => !value)}><span aria-hidden>{menuOpen ? "✕" : "☰"}</span></button>
        <a href="/" className="flex items-center" aria-label="An An Shop - Trang chủ"><img src="/logo.png" alt="An An Logo" className="h-14 w-auto object-contain mix-blend-multiply" /></a>
        <nav className="hidden flex-1 items-center justify-center gap-6 lg:flex" aria-label="Danh mục chính">{Object.entries(categoryLabels).map(([key, value]) => <Link className="text-sm text-[#4f4141] hover:text-[#c26b77]" href={`/products?category=${key}`} key={key}>{value}</Link>)}</nav>
        <div className="ml-auto flex items-center gap-1 text-sm">
          <button type="button" className="rounded-full px-3 py-2 hover:bg-[#fcf4f5]" aria-expanded={searchOpen} aria-controls="site-search" onClick={() => setSearchOpen((value) => !value)}>Tìm kiếm</button>
          <Link className="hidden rounded-full px-3 py-2 hover:bg-[#fcf4f5] sm:block" href="/account">Tài khoản</Link>
          <Link className="rounded-full bg-[#f7e6e8] px-3 py-2 font-semibold text-[#ce7a85] sm:px-4" href="/cart">Giỏ hàng</Link>
        </div>
      </div>
      {searchOpen && <form id="site-search" action="/products" className="border-t border-[#f0e1e3] bg-white px-4 py-4" role="search"><div className="mx-auto flex max-w-2xl gap-2"><label className="sr-only" htmlFor="global-search">Tìm sản phẩm</label><input id="global-search" name="q" className="min-w-0 flex-1 rounded-xl border border-[#d9d0cb] px-4 py-3" placeholder="Tìm theo tên hoặc chất liệu…" autoFocus/><button className="rounded-xl bg-[#ce7a85] px-5 py-3 font-semibold text-white">Tìm</button></div></form>}
      <nav id={menuId} hidden={!menuOpen} className="border-t border-[#f0e1e3] bg-white px-4 py-4 lg:hidden" aria-label="Điều hướng di động"><div className="mx-auto grid max-w-7xl gap-1">{Object.entries(categoryLabels).map(([key, value]) => <Link className="rounded-xl px-4 py-3 hover:bg-[#fcf4f5]" href={`/products?category=${key}`} key={key}>{value}</Link>)}<Link className="rounded-xl px-4 py-3 hover:bg-[#fcf4f5] sm:hidden" href="/account">Tài khoản</Link></div></nav>
    </header>
  </>;
}

export function SiteFooter() {
  return <footer className="mt-24 bg-[#3b2f2f] text-[#f5ebe6]"><div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4"><div><img src="/logo.png" alt="An An Logo" className="h-16 w-auto object-contain rounded-2xl" /><p className="mt-4 max-w-xs text-sm leading-6 text-[#d8cac4]">Thiết kế dịu dàng, an toàn và thấu hiểu dành cho mẹ và bé.</p></div><FooterLinks title="Mua sắm" links={[["Sản phẩm", "/products"], ["Yêu thích", "/account/wishlist"], ["Giỏ hàng", "/cart"]]}/><FooterLinks title="Hỗ trợ" links={[["Đơn hàng", "/account/orders"], ["Địa chỉ", "/account/addresses"], ["Liên hệ", "mailto:hello@ananshop.vn"]]}/><div><h2 className="font-semibold">An An luôn ở đây</h2><p className="mt-4 text-sm leading-7 text-[#d8cac4]">1900 6868<br/>hello@ananshop.vn<br/>08:30–21:00 mỗi ngày</p></div></div></footer>;
}

function FooterLinks({ title, links }: { title: string; links: [string, string][] }) { return <div><h2 className="font-semibold">{title}</h2><ul className="mt-4 space-y-3 text-sm text-[#d8cac4]">{links.map(([label, href]) => <li key={label}><Link className="hover:text-white" href={href}>{label}</Link></li>)}</ul></div>; }

export function StorefrontShell({ children }: { children: React.ReactNode }) { return <div className="min-h-screen bg-[#fffcfc] text-[#3b2f2f]"><SiteHeader/><div id="main-content" tabIndex={-1}>{children}</div><SiteFooter/></div>; }

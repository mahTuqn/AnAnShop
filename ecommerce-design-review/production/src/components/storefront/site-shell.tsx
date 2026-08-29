import Link from "next/link";
import { categoryLabels } from "@/lib/storefront/data";

export function SiteHeader() {
  return <><div className="bg-[#713c33] px-4 py-2 text-center text-xs tracking-wide text-white">Miễn phí vận chuyển cho đơn từ 699.000đ · Đổi size trong 14 ngày</div><header className="sticky top-0 z-30 border-b border-[#e9dfda] bg-[#fffdfb]/95 backdrop-blur"><div className="mx-auto flex h-18 max-w-7xl items-center gap-5 px-4 sm:px-6"><Link href="/" className="font-serif text-3xl font-bold tracking-tight text-[#713c33]" aria-label="An An Shop - Trang chủ">an an<span className="text-[#c37a68]">.</span></Link><nav className="hidden flex-1 items-center justify-center gap-6 lg:flex" aria-label="Danh mục chính">{Object.entries(categoryLabels).map(([key, value]) => <Link className="text-sm text-[#453b37] hover:text-[#8a493d]" href={`/products?category=${key}`} key={key}>{value}</Link>)}</nav><div className="ml-auto flex items-center gap-2 text-sm"><Link className="rounded-full px-3 py-2 hover:bg-[#f7eeea]" href="/products?q=">Tìm kiếm</Link><Link className="rounded-full px-3 py-2 hover:bg-[#f7eeea]" href="/account">Tài khoản</Link><Link className="rounded-full bg-[#f3e5de] px-4 py-2 font-semibold text-[#713c33]" href="/cart">Giỏ hàng</Link></div></div></header></>;
}

export function SiteFooter() {
  return <footer className="mt-24 bg-[#312724] text-[#f5ebe6]"><div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4"><div><p className="font-serif text-3xl">an an.</p><p className="mt-4 max-w-xs text-sm leading-6 text-[#d8cac4]">Thiết kế dịu dàng, an toàn và thấu hiểu dành cho mẹ và bé.</p></div><FooterLinks title="Mua sắm" links={[["Sản phẩm", "/products"], ["Yêu thích", "/account/wishlist"], ["Giỏ hàng", "/cart"]]}/><FooterLinks title="Hỗ trợ" links={[["Đơn hàng", "/account/orders"], ["Địa chỉ", "/account/addresses"], ["Liên hệ", "mailto:hello@ananshop.vn"]]}/><div><h2 className="font-semibold">An An luôn ở đây</h2><p className="mt-4 text-sm leading-7 text-[#d8cac4]">1900 6868<br/>hello@ananshop.vn<br/>08:30–21:00 mỗi ngày</p></div></div></footer>;
}

function FooterLinks({ title, links }: { title: string; links: [string, string][] }) { return <div><h2 className="font-semibold">{title}</h2><ul className="mt-4 space-y-3 text-sm text-[#d8cac4]">{links.map(([label, href]) => <li key={label}><Link className="hover:text-white" href={href}>{label}</Link></li>)}</ul></div>; }

export function StorefrontShell({ children }: { children: React.ReactNode }) { return <div className="min-h-screen bg-[#fffdfb] text-[#332824]"><SiteHeader/>{children}<SiteFooter/></div>; }

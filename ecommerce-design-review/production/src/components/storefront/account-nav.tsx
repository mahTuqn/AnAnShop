"use client";
import Link from "next/link";
import { LogoutButton } from "./logout-button";
import { usePathname } from "next/navigation";
const links = [["Tổng quan", "/account"], ["Hồ sơ", "/account/profile"], ["Đơn hàng", "/account/orders"], ["Địa chỉ", "/account/addresses"], ["Yêu thích", "/account/wishlist"]];
export function AccountNav() { const pathname = usePathname(); return <aside className="h-fit rounded-2xl bg-white p-5 shadow-sm"><div className="border-b pb-5"><span className="grid size-12 place-items-center rounded-full bg-[#f7e6e8] font-serif text-lg text-[#ce7a85]">MA</span><strong className="mt-3 block">Nguyễn Minh Anh</strong><span className="text-xs text-[#776b65]">Thành viên Mầm Non</span></div><nav className="mt-4 flex gap-2 overflow-auto lg:flex-col" aria-label="Tài khoản">{links.map(([label, href]) => <Link className={`shrink-0 rounded-xl px-4 py-3 text-sm ${pathname === href || (href !== "/account" && pathname.startsWith(href)) ? "bg-[#f7e6e8] font-semibold text-[#ce7a85]" : "hover:bg-[#f8f4f1]"}`} href={href} key={href}>{label}</Link>)}</nav><LogoutButton /></aside>; }

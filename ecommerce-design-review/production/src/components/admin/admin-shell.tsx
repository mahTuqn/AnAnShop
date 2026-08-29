"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { adminNav } from "@/lib/admin/admin-data";

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin/login") return <>{children}</>;
  return (
    <div className="min-h-screen bg-[#f7f6f3] text-slate-900">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">Bỏ qua điều hướng</a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-[#b06b75] text-white lg:flex lg:flex-col">
        <Link href="/admin" className="flex items-center gap-3 border-b border-white/10 px-6 py-5 text-2xl font-semibold tracking-tight"><img src="/logo.png" alt="An An Logo" className="h-10 w-auto object-contain rounded-xl" /><span className="text-xs font-medium uppercase tracking-[0.22em] text-rose-100">Admin</span></Link>
        <nav aria-label="Điều hướng quản trị" className="flex-1 space-y-1 overflow-y-auto p-4">
          {adminNav.map(([href, label]) => {
            const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
            return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`block rounded-xl px-4 py-2.5 text-sm transition ${active ? "bg-white text-[#b06b75] shadow-sm" : "text-rose-50 hover:bg-white/10"}`}>{label}</Link>;
          })}
        </nav>
        <div className="border-t border-white/10 p-5 text-sm"><p className="font-medium">An An Admin</p><p className="text-rose-100">Chủ cửa hàng</p></div>
      </aside>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <label className="sr-only" htmlFor="admin-mobile-nav">Chọn khu vực quản trị</label>
        <select id="admin-mobile-nav" value={adminNav.find(([href]) => href === "/admin" ? pathname === href : pathname.startsWith(href))?.[0] ?? "/admin"} onChange={(event) => window.location.assign(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium">
          {adminNav.map(([href, label]) => <option key={href} value={href}>{label}</option>)}
        </select>
      </header>
      <main id="admin-main" className="min-w-0 p-4 sm:p-6 lg:ml-64 lg:p-8 xl:p-10">{children}</main>
    </div>
  );
}

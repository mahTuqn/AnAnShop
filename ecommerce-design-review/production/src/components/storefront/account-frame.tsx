"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/storefront/api";
import { LogoutButton } from "./logout-button";

type Session = { user: { id: string; email: string; fullName: string; status: string }; expiresAt: string };
const links = [["Tổng quan", "/account"], ["Hồ sơ", "/account/profile"], ["Đơn hàng", "/account/orders"], ["Địa chỉ", "/account/addresses"], ["Yêu thích", "/account/wishlist"]];

export function AccountFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { apiRequest<Session>("/api/auth/session", { method: "GET" }).then(setSession).catch(() => { setError("Phiên đăng nhập đã hết hạn. Đang chuyển đến trang đăng nhập…"); const timer = window.setTimeout(() => router.replace(`/login?next=${encodeURIComponent(pathname)}`), 500); return () => window.clearTimeout(timer); }); }, [pathname, router]);
  if (!session) return <main className="mx-auto min-h-[50vh] max-w-7xl px-4 py-12 sm:px-6"><p className={`rounded-2xl p-5 text-sm ${error ? "bg-amber-50 text-amber-900" : "bg-white text-[#6b5e5e]"}`} role="status">{error || "Đang kiểm tra phiên đăng nhập…"}</p></main>;
  const initials = session.user.fullName.split(/\s+/).slice(-2).map((part) => part[0]).join("").toLocaleUpperCase("vi");
  return <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6"><div className="mb-9"><p className="text-xs font-semibold tracking-[.2em] text-[#c26b77]">TÀI KHOẢN CỦA MẸ</p><h1 className="mt-2 font-serif text-4xl">Xin chào, {session.user.fullName}</h1></div><div className="grid gap-8 lg:grid-cols-[240px_1fr]"><aside className="h-fit rounded-2xl bg-white p-5 shadow-sm"><div className="border-b pb-5"><span className="grid size-12 place-items-center rounded-full bg-[#f7e6e8] font-serif text-lg text-[#ce7a85]" aria-hidden>{initials}</span><strong className="mt-3 block">{session.user.fullName}</strong><span className="break-all text-xs text-[#625853]">{session.user.email}</span></div><nav className="mt-4 flex gap-2 overflow-auto lg:flex-col" aria-label="Tài khoản">{links.map(([label, href]) => { const current = pathname === href || (href !== "/account" && pathname.startsWith(href)); return <Link className={`shrink-0 rounded-xl px-4 py-3 text-sm ${current ? "bg-[#f7e6e8] font-semibold text-[#ce7a85]" : "hover:bg-[#f8f4f1]"}`} href={href} aria-current={current ? "page" : undefined} key={href}>{label}</Link>; })}</nav><LogoutButton/></aside><div>{children}</div></div></main>;
}

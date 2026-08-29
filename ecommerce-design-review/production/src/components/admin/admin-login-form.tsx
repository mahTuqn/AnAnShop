"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLoginForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const login = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      const loginPayload = await login.json().catch(() => null) as { error?: { message?: string } } | null;
      if (!login.ok) throw new Error(loginPayload?.error?.message ?? "Không thể đăng nhập.");

      const authorization = await fetch("/api/admin/dashboard", { credentials: "same-origin", cache: "no-store" });
      if (!authorization.ok) {
        await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
        if (authorization.status === 403) throw new Error("Tài khoản này không có quyền truy cập khu vực quản trị.");
        throw new Error("Không thể xác minh phiên quản trị. Vui lòng thử lại.");
      }

      router.replace(callbackUrl);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể đăng nhập quản trị.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-[#f5f3ef] lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-[#173c32] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 size-80 rounded-full bg-[#d9a28f]/20" aria-hidden />
        <div className="relative">
          <p className="text-3xl font-semibold tracking-tight">an an.<span className="ml-2 text-sm uppercase tracking-[.25em] text-emerald-100">Admin</span></p>
          <p className="mt-6 max-w-md text-lg leading-8 text-emerald-50">Không gian vận hành riêng dành cho đội ngũ quản trị cửa hàng.</p>
        </div>
        <div className="relative grid gap-4 text-sm text-emerald-50 sm:grid-cols-3">
          <span>Đơn hàng</span><span>Sản phẩm</span><span>Kho vận</span>
        </div>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-10" data-testid="admin-login-page">
          <div className="lg:hidden"><p className="text-2xl font-semibold text-[#173c32]">an an. <span className="text-xs uppercase tracking-[.2em]">Admin</span></p></div>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[.22em] text-emerald-800 lg:mt-0">Cổng quản trị</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Đăng nhập quản trị</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Chỉ tài khoản ADMIN hoặc STAFF được cấp quyền mới có thể tiếp tục.</p>

          <form className="mt-8 space-y-5" onSubmit={submit}>
            <label className="block text-sm font-medium text-slate-800">Email quản trị
              <input name="email" type="email" autoComplete="username" autoFocus required className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15" />
            </label>
            <label className="block text-sm font-medium text-slate-800">Mật khẩu
              <input name="password" type="password" minLength={8} maxLength={128} autoComplete="current-password" required className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15" />
            </label>
            {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
            <button type="submit" disabled={pending} className="min-h-12 w-full rounded-xl bg-[#173c32] px-5 font-semibold text-white transition hover:bg-[#225447] disabled:cursor-wait disabled:opacity-60">
              {pending ? "Đang xác minh…" : "Vào trang quản trị"}
            </button>
          </form>
          <a href="/" className="mt-6 block text-center text-sm font-medium text-emerald-800 underline underline-offset-4">Quay lại cửa hàng</a>
        </div>
      </section>
    </main>
  );
}
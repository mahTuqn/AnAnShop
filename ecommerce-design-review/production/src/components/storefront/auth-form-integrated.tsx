"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiRequest, saveAuthToken } from "@/lib/storefront/api";

type Mode = "login" | "register" | "forgot" | "reset";
type Session = { token: string };

export function AuthFormIntegrated({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const config = { login: ["Chào mẹ quay lại", "Đăng nhập để theo dõi đơn hàng và lưu những điều mẹ yêu thích."], register: ["Đăng ký tài khoản", "Chỉ một phút để mua sắm thuận tiện và nhận ưu đãi riêng."], forgot: ["Quên mật khẩu?", "Nhập email, An An sẽ gửi đường dẫn đặt lại mật khẩu."], reset: ["Đặt mật khẩu mới", "Mật khẩu nên có ít nhất 8 ký tự, gồm chữ và số."] }[mode];
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setStatus("");
    const form = new FormData(event.currentTarget); const password = String(form.get("password") ?? "");
    if (mode === "register" && password !== String(form.get("confirmPassword") ?? "")) { setError("Mật khẩu xác nhận chưa khớp."); return; }
    if (mode === "forgot") { setError("Kênh gửi email đặt lại mật khẩu chưa được cấu hình. Vui lòng liên hệ CSKH để được hỗ trợ an toàn."); return; }
    if (mode === "reset") { setError("Liên kết đặt lại mật khẩu chưa hợp lệ hoặc dịch vụ chưa được cấu hình. Mật khẩu của mẹ chưa bị thay đổi."); return; }
    setPending(true);
    try {
      if (mode === "register") {
        await apiRequest("/api/auth/register", { method: "POST", body: JSON.stringify({ email: form.get("email"), password, fullName: form.get("name") }) });
        router.push("/login?registered=1");
      } else {
        const session = await apiRequest<Session>("/api/auth/login", { method: "POST", body: JSON.stringify({ email: form.get("email"), password }) });
        saveAuthToken(session.token); router.push("/account");
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể xử lý yêu cầu."); }
    finally { setPending(false); }
  };
  return <div data-testid={`auth-${mode}-page`}><p className="text-xs font-semibold tracking-[.2em] text-[#8a493d]">TÀI KHOẢN AN AN</p><h1 className="mt-3 font-serif text-4xl">{config[0]}</h1><p className="mt-3 leading-7 text-[#6d625d]">{config[1]}</p><form className="mt-8 space-y-5" onSubmit={submit} data-testid="auth-form">{mode === "register" && <Input label="Họ và tên" name="name" autoComplete="name"/>}<Input label="Email" name="email" type="email" autoComplete="email"/>{(mode === "login" || mode === "register") && <Input label="Mật khẩu" name="password" type="password" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"}/>} {mode === "register" && <Input label="Xác nhận mật khẩu" name="confirmPassword" type="password" minLength={8} autoComplete="new-password"/>}{mode === "reset" && <><Input label="Mật khẩu mới" name="password" type="password" minLength={8}/><Input label="Nhập lại mật khẩu" name="confirmPassword" type="password" minLength={8}/></>}{mode === "register" && <label className="flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" required/><span>Tôi đồng ý với điều khoản sử dụng và chính sách bảo mật.</span></label>}{mode === "login" && <div className="text-right"><a className="text-sm text-[#713c33] underline" href="/forgot-password">Quên mật khẩu?</a></div>}<Button className="w-full" disabled={pending} data-testid="auth-submit">{pending ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : mode === "register" ? "Tạo tài khoản" : mode === "forgot" ? "Gửi hướng dẫn" : "Lưu mật khẩu mới"}</Button>{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}{status && <p className="rounded-xl bg-white p-3 text-sm text-[#536b57]" role="status">{status}</p>}</form><p className="mt-7 text-center text-sm text-[#6d625d]">{mode === "login" ? <>Chưa có tài khoản? <a className="font-semibold text-[#713c33] underline" href="/register">Đăng ký ngay</a></> : <>Đã có tài khoản? <a className="font-semibold text-[#713c33] underline" href="/login">Đăng nhập</a></>}</p></div>;
}
function Input({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) { return <label className="block text-sm font-medium">{label}<input className="mt-2 w-full rounded-xl border border-[#d9d0cb] bg-white px-4 py-3" required {...props}/></label>; }

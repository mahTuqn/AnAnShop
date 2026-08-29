"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/ui/states";
import { apiRequest } from "@/lib/storefront/api";

type Profile = { id: string; email: string; fullName: string; phone?: string | null; avatarUrl?: string | null; status: string };

export function AccountProfileClient() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  useEffect(() => { apiRequest<Profile>("/api/account/profile", { method: "GET" }).then(setProfile).catch((reason) => setError(reason instanceof Error ? reason.message : "Không thể tải hồ sơ.")); }, []);
  if (!profile && !error) return <PageSkeleton />;
  if (!profile) return <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">{error}</p>;

  const updateProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setPending(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const next = await apiRequest<Profile>("/api/account/profile", { method: "PATCH", body: JSON.stringify({ fullName: form.get("fullName"), phone: form.get("phone"), avatarUrl: form.get("avatarUrl") || undefined }) });
      setProfile(next); setMessage("Đã lưu hồ sơ.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể lưu hồ sơ."); }
    finally { setPending(false); }
  };
  const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setPending(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    if (form.get("newPassword") !== form.get("confirmPassword")) { setError("Mật khẩu xác nhận không khớp."); setPending(false); return; }
    try {
      await apiRequest("/api/account/password", { method: "POST", body: JSON.stringify({ currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword") }) });
      localStorage.removeItem("anan_auth_token");
      router.replace("/login?passwordChanged=1");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể đổi mật khẩu."); setPending(false); }
  };

  return <div className="space-y-8">
    {(message || error) && <p className={`rounded-xl p-4 text-sm ${error ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`} role={error ? "alert" : "status"}>{error || message}</p>}
    <form onSubmit={updateProfile} className="rounded-2xl bg-white p-6 shadow-sm"><h2 className="font-serif text-3xl">Hồ sơ cá nhân</h2><div className="mt-6 grid gap-5 sm:grid-cols-2">
      <Field label="Họ và tên" name="fullName" defaultValue={profile.fullName} />
      <Field label="Số điện thoại" name="phone" type="tel" defaultValue={profile.phone ?? ""} />
      <Field label="Email" name="email" type="email" defaultValue={profile.email} disabled />
      <Field label="Ảnh đại diện (URL HTTPS)" name="avatarUrl" type="url" defaultValue={profile.avatarUrl ?? ""} required={false} />
    </div>
      {profile.avatarUrl && <img className="mt-5 size-20 rounded-full object-cover" src={profile.avatarUrl} alt="Ảnh đại diện hiện tại" />}
      <p className="mt-3 text-xs text-[#625853]">Chỉ lưu URL HTTPS an toàn. Tải file trực tiếp sẽ được bật khi cấu hình kho lưu trữ đối tượng; hệ thống không giả vờ đã tải ảnh lên.</p>
      <Button className="mt-6" disabled={pending}>{pending ? "Đang lưu…" : "Lưu hồ sơ"}</Button>
    </form>
    <form onSubmit={changePassword} className="rounded-2xl bg-white p-6 shadow-sm"><h2 className="font-serif text-3xl">Đổi mật khẩu</h2><p className="mt-2 text-sm text-[#625853]">Sau khi đổi, mọi phiên đăng nhập sẽ bị thu hồi để bảo vệ tài khoản.</p><div className="mt-6 grid gap-5 sm:grid-cols-3">
      <Field label="Mật khẩu hiện tại" name="currentPassword" type="password" />
      <Field label="Mật khẩu mới" name="newPassword" type="password" minLength={12} />
      <Field label="Xác nhận mật khẩu" name="confirmPassword" type="password" minLength={12} />
    </div><Button className="mt-6" disabled={pending}>Đổi mật khẩu</Button></form>
  </div>;
}

function Field({ label, name, type = "text", defaultValue, disabled, required = true, minLength }: { label: string; name: string; type?: string; defaultValue?: string; disabled?: boolean; required?: boolean; minLength?: number }) {
  return <label className="block text-sm font-medium">{label}{required && " *"}<input className="mt-2 w-full rounded-xl border px-4 py-3 disabled:bg-[#f2efed]" name={name} type={type} defaultValue={defaultValue} disabled={disabled} required={required} minLength={minLength} /></label>;
}

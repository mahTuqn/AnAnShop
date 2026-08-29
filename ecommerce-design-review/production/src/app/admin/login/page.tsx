import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

export const metadata: Metadata = { title: "Đăng nhập quản trị | An An Shop", robots: { index: false, follow: false } };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const requested = (await searchParams).callbackUrl;
  const callbackUrl = requested?.startsWith("/admin") && !requested.startsWith("//") ? requested : "/admin";
  return <AdminLoginForm callbackUrl={callbackUrl} />;
}
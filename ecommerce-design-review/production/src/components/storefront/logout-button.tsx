"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest } from "@/lib/storefront/api";

export function LogoutButton() {
  const router = useRouter(); const [pending, setPending] = useState(false);
  return <button className="mt-4 w-full border-t px-4 pt-4 text-left text-sm text-[#8a493d] disabled:opacity-50" disabled={pending} onClick={async () => { setPending(true); try { await apiRequest<{ loggedOut: boolean }>("/api/auth/logout", { method: "POST" }); } finally { localStorage.removeItem("anan_auth_token"); router.replace("/login"); router.refresh(); } }} data-testid="logout">{pending ? "Đang đăng xuất..." : "Đăng xuất"}</button>;
}

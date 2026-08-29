import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/server/prisma";
import { getRuntime } from "@/lib/server/runtime-resolver";

export const ADMIN_SESSION_COOKIES = ["anan_session", "anan_admin_session"] as const;

/** Dev keeps the fixture backoffice usable; production is fail-closed by default. */
export function adminDemoEnabled(): boolean {
  return process.env.ADMIN_DEMO_MODE === "true" || (process.env.NODE_ENV !== "production" && process.env.ADMIN_DEMO_MODE !== "false");
}

export async function requireAdminPageSession(callbackPath = "/admin", permission?: string): Promise<void> {
  if (adminDemoEnabled()) return;
  const cookieStore = await cookies();
  const token = ADMIN_SESSION_COOKIES.map((name) => cookieStore.get(name)?.value).find(Boolean);
  if (!token) redirect(`/admin/login?callbackUrl=${encodeURIComponent(callbackPath)}`);

  try {
    const runtime = await getRuntime();
    const session = await runtime.store.resolveSession(token);
    if (!session) redirect(`/admin/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
    const rows = await getPrisma().$queryRawUnsafe<Array<{ role_code: string; permission_code: string | null }>>(
      `SELECT DISTINCT r.code AS role_code, p.code AS permission_code
         FROM user_roles ur JOIN roles r ON r.id=ur.role_id
         LEFT JOIN role_permissions rp ON rp.role_id=r.id
         LEFT JOIN permissions p ON p.id=rp.permission_id
        WHERE ur.user_id=$1::uuid`,
      session.user.id,
    );
    const isAdmin = rows.some(({ role_code }) => role_code === "ADMIN");
    const isStaff = rows.some(({ role_code }) => role_code === "STAFF");
    if (!isAdmin && !isStaff) redirect("/forbidden");
    if (permission && !isAdmin && !rows.some(({ permission_code }) => permission_code === permission)) redirect("/forbidden");
  } catch (error) {
    // Next redirect is implemented as a framework error and must escape.
    if (typeof error === "object" && error && "digest" in error && String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")) throw error;
    redirect(`/admin/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }
}


import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const write = (file, source) => fs.writeFileSync(file, source, "utf8");
const edit = (file, transform) => write(file, transform(read(file)));
const exact = (source, before, after, label) => {
  if (!source.includes(before)) throw new Error(`Missing ${label}`);
  return source.replace(before, after);
};

write("production/src/app/api/auth/login/route.ts", 'export { loginPost as POST } from "@/lib/server/auth-handlers";\n');
write("production/src/app/api/auth/register/route.ts", 'export { registerPost as POST } from "@/lib/server/auth-handlers";\n');
write("production/src/app/api/checkout/route.ts", 'export { checkoutPost as POST } from "@/lib/server/checkout-handler";\n');

edit("production/src/lib/server/http.ts", (source) => {
  const oldBlock = [
    '  const authorization = request.headers.get("authorization");',
    '  if (authorization?.startsWith("Bearer ")) {',
    '    const session = await runtime.store.resolveSession(authorization.slice(7));',
    '    if (!session) throw new AppError("UNAUTHORIZED", "Phiên đăng nhập không hợp lệ", 401);',
    '    return `user:${session.user.id}`;',
    '  }',
  ].join("\n");
  const newBlock = [
    '  const authorization = request.headers.get("authorization");',
    '  if (authorization && !authorization.startsWith("Bearer ")) throw new AppError("UNAUTHORIZED", "Header xác thực không hợp lệ", 401);',
    '  const token = authorization?.slice(7) || request.cookies.get("anan_session")?.value;',
    '  if (token) {',
    '    const session = await runtime.store.resolveSession(token);',
    '    if (!session) throw new AppError("UNAUTHORIZED", "Phiên đăng nhập không hợp lệ", 401);',
    '    return `user:${session.user.id}`;',
    '  }',
  ].join("\n");
  return exact(source, oldBlock, newBlock, "cookie-aware owner resolution");
});

edit("production/src/components/storefront/account-nav.tsx", (source) => {
  source = exact(source, 'import Link from "next/link";', 'import Link from "next/link";\nimport { LogoutButton } from "./logout-button";', "logout import");
  return exact(source, '<a href="/login" className="mt-4 block border-t px-4 pt-4 text-sm text-[#8a493d]">Đăng xuất</a>', '<LogoutButton />', "logout control");
});

edit("production/src/lib/admin/page-guard.ts", (source) => {
  source = exact(source, 'export const ADMIN_SESSION_COOKIE = "anan_admin_session";', 'export const ADMIN_SESSION_COOKIES = ["anan_session", "anan_admin_session"] as const;', "admin cookie constants");
  return exact(source, 'const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;', 'const cookieStore = await cookies();\n  const token = ADMIN_SESSION_COOKIES.map((name) => cookieStore.get(name)?.value).find(Boolean);', "admin cookie lookup");
});

edit("production/src/modules/admin/state-machine.ts", (source) => source
  .replace("(to in orderTransitions)", "Object.hasOwn(orderTransitions, to)")
  .replace("(to in returnTransitions)", "Object.hasOwn(returnTransitions, to)"));
edit("production/src/app/api/admin/audit/route.ts", (source) => exact(source, '"reports.read"', '"audit.read"', "audit permission"));

const gone = (replacement) => [
  'import { NextResponse } from "next/server";',
  '',
  `export const PATCH = () => NextResponse.json({ error: { code: "GONE", message: "${replacement}" } }, { status: 410 });`,
  '',
].join("\n");
write("production/src/app/api/admin/orders/[id]/route.ts", gone("Dùng endpoint /transition để đổi trạng thái đơn hàng"));
write("production/src/app/api/admin/returns/[id]/route.ts", gone("Dùng endpoint /transition để đổi trạng thái đổi trả"));
write("production/src/app/api/admin/staff/[id]/roles/route.ts", gone("Dùng endpoint /roles/:roleCode để gán hoặc thu hồi vai trò"));

console.log("Auth cookies, admin guard, state machines and RBAC integration applied.");

import fs from "node:fs";

const route = (permission, message) => `import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/admin";
import { safeRoute } from "@/lib/server/http";

export const PATCH = (request: NextRequest) => safeRoute(async () => {
  await requireAdmin(request, "${permission}");
  return NextResponse.json({ error: { code: "GONE", message: "${message}" } }, { status: 410 });
});
`;

fs.writeFileSync("production/src/app/api/admin/orders/[id]/route.ts", route("orders.write", "Dùng endpoint /transition để đổi trạng thái đơn hàng"), "utf8");
fs.writeFileSync("production/src/app/api/admin/returns/[id]/route.ts", route("orders.write", "Dùng endpoint /transition để đổi trạng thái đổi trả"), "utf8");
fs.writeFileSync("production/src/app/api/admin/staff/[id]/roles/route.ts", route("staff.write", "Dùng endpoint /roles/:roleCode để gán hoặc thu hồi vai trò"), "utf8");
console.log("Legacy admin routes now authenticate before returning 410.");

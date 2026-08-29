import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/admin";
import { safeRoute } from "@/lib/server/http";

export const PATCH = (request: NextRequest) => safeRoute(async () => {
  await requireAdmin(request, "staff.write");
  return NextResponse.json({ error: { code: "GONE", message: "Dùng endpoint /roles/:roleCode để gán hoặc thu hồi vai trò" } }, { status: 410 });
});

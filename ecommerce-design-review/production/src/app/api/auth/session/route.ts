import { NextRequest, NextResponse } from "next/server";
import { sessionTokenFrom } from "@/lib/server/auth-session";
import { safeRoute } from "@/lib/server/http";
import { runtime } from "@/lib/server/runtime-selected";
import { AppError } from "@/modules/shared";

export async function GET(request: NextRequest): Promise<NextResponse> {
  return safeRoute(async () => {
    const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/)?.[1];
    const session = await runtime.store.resolveSession(bearer ?? sessionTokenFrom(request) ?? "");
    if (!session) throw new AppError("UNAUTHORIZED", "Phiên đăng nhập không hợp lệ", 401);
    return NextResponse.json({ data: { user: session.user, expiresAt: session.expiresAt } });
  });
}

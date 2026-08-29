import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, revokeSession, sessionTokenFrom } from "@/lib/server/auth-session";
import { safeRoute } from "@/lib/server/http";

export async function POST(request: NextRequest): Promise<NextResponse> {
  return safeRoute(async () => {
    const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/)?.[1];
    await revokeSession(bearer ?? sessionTokenFrom(request));
    const response = NextResponse.json({ data: { loggedOut: true } });
    clearSessionCookie(response);
    return response;
  });
}

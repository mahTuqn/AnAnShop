import { NextRequest, NextResponse } from "next/server";
import { issueOneTimeTokenByEmail } from "@/lib/server/auth-tokens";
import { safeRoute } from "@/lib/server/http";
import { object, stringField } from "@/modules/shared";

export async function POST(request: NextRequest): Promise<NextResponse> {
  return safeRoute(async () => {
    const body = object(await request.json());
    const result = await issueOneTimeTokenByEmail(stringField(body, "email", { max: 320 })!, "PASSWORD_RESET");
    return NextResponse.json({ data: result }, { status: 202, headers: { "cache-control": "no-store" } });
  });
}

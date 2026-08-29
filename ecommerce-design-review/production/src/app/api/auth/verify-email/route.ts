import { NextRequest, NextResponse } from "next/server";
import { issueOneTimeTokenByEmail, verifyEmailToken } from "@/lib/server/auth-tokens";
import { safeRoute } from "@/lib/server/http";
import { object, stringField } from "@/modules/shared";

export async function POST(request: NextRequest): Promise<NextResponse> {
  return safeRoute(async () => {
    const body = object(await request.json());
    if (body.token !== undefined) return NextResponse.json({ data: await verifyEmailToken(stringField(body, "token", { min: 32, max: 200 })!) });
    const result = await issueOneTimeTokenByEmail(stringField(body, "email", { max: 320 })!, "EMAIL_VERIFICATION");
    return NextResponse.json({ data: result }, { status: 202, headers: { "cache-control": "no-store" } });
  });
}

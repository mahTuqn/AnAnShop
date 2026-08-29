import { NextRequest, NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/server/auth-tokens";
import { safeRoute } from "@/lib/server/http";
import { object, stringField } from "@/modules/shared";

export async function POST(request: NextRequest): Promise<NextResponse> {
  return safeRoute(async () => {
    const body = object(await request.json());
    const result = await resetPasswordWithToken(stringField(body, "token", { min: 32, max: 200 })!, stringField(body, "newPassword", { min: 8, max: 128 })!);
    return NextResponse.json({ data: result }, { headers: { "cache-control": "no-store" } });
  });
}

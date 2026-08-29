import { NextRequest, NextResponse } from "next/server";
import { object, stringField } from "@/modules/shared";
import { jsonResult, safeRoute } from "./http";
import { sessionResult } from "./auth-session";
import { issueOneTimeTokenByEmail } from "./auth-tokens";
import { runtime } from "./runtime-selected";

export async function loginPost(request: NextRequest): Promise<NextResponse> {
  return safeRoute(async () => {
    const body = object(await request.json());
    return sessionResult(await runtime.auth.login({ email: stringField(body, "email", { max: 320 })!, password: stringField(body, "password", { max: 128 })! }));
  });
}

export async function registerPost(request: NextRequest): Promise<NextResponse> {
  return safeRoute(async () => {
    const body = object(await request.json());
    const email = stringField(body, "email", { max: 320 })!;
    const password = stringField(body, "password", { min: 8, max: 128 })!;
    const registered = await runtime.auth.register({ email, password, fullName: stringField(body, "fullName", { min: 2, max: 150 })! });
    if (!registered.ok) return jsonResult(registered, 201);
    const verification = process.env.DATABASE_URL ? await issueOneTimeTokenByEmail(email, "EMAIL_VERIFICATION") : { accepted: true, deliveryConfigured: false };
    if (registered.value.status === "PENDING_VERIFICATION") return NextResponse.json({ data: { user: registered.value, verification } }, { status: 201 });
    return sessionResult(await runtime.auth.login({ email, password }), 201);
  });
}

import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type { AuthSession } from "@/modules/auth";
import type { Result } from "@/modules/shared";
import { jsonResult } from "./http";
import { getPrisma } from "./prisma";
import { runtime } from "./runtime-selected";

export const SESSION_COOKIE = "anan_session";

export function sessionTokenFrom(request: NextRequest): string | undefined {
  return request.cookies.get(SESSION_COOKIE)?.value;
}

export function sessionResult(result: Result<AuthSession>, status = 200): NextResponse {
  const response = jsonResult(result, status);
  if (result.ok) response.cookies.set(SESSION_COOKIE, result.value.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: result.value.expiresAt,
  });
  return response;
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}

export async function revokeSession(token: string | undefined): Promise<void> {
  if (!token) return;
  if (process.env.USE_MEMORY_STORE !== "true" && process.env.DATABASE_URL) {
    const hash = createHash("sha256").update(token).digest("hex");
    await getPrisma().$executeRawUnsafe("UPDATE auth_tokens SET consumed_at = NOW() WHERE token_hash = $1 AND consumed_at IS NULL", hash);
    return;
  }
  runtime.store.sessions.delete(token);
}

import { NextRequest, NextResponse } from "next/server";
import { AppError, Result } from "@/modules/shared";
import { runtime } from "./runtime-selected";

export const jsonResult = <T>(result: Result<T>, successStatus = 200): NextResponse => result.ok
  ? NextResponse.json({ data: result.value }, { status: successStatus })
  : NextResponse.json({ error: { code: result.error.code, message: result.error.message, details: result.error.details } }, { status: result.error.status });

export async function safeRoute(operation: () => Promise<NextResponse>): Promise<NextResponse> {
  try { return await operation(); }
  catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: { code: error.code, message: error.message, details: error.details } }, { status: error.status });
    console.error("Unhandled API error", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Đã xảy ra lỗi hệ thống" } }, { status: 500 });
  }
}

export async function ownerFrom(request: NextRequest): Promise<string> {
  const authorization = request.headers.get("authorization");
  if (authorization && !authorization.startsWith("Bearer ")) throw new AppError("UNAUTHORIZED", "Header xác thực không hợp lệ", 401);
  const token = authorization?.slice(7) || request.cookies.get("anan_session")?.value;
  if (token) {
    const session = await runtime.store.resolveSession(token);
    if (!session) throw new AppError("UNAUTHORIZED", "Phiên đăng nhập không hợp lệ", 401);
    return `user:${session.user.id}`;
  }
  const sessionId = request.headers.get("x-session-id")?.trim();
  if (!sessionId || sessionId.length < 8 || sessionId.length > 128) throw new AppError("UNAUTHORIZED", "Thiếu phiên khách x-session-id", 401);
  return `guest:${sessionId}`;
}


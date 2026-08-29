import { NextRequest } from "next/server";
import { AppError } from "@/modules/shared";
import { getPrisma } from "./prisma";
import { sessionTokenFrom } from "./auth-session";
import { runtime } from "./runtime-selected";

export type AccountActor = { userId: string; token: string };

export async function requireAccount(request: NextRequest): Promise<AccountActor> {
  const authorization = request.headers.get("authorization");
  if (authorization && !authorization.startsWith("Bearer ")) throw new AppError("UNAUTHORIZED", "Header xác thực không hợp lệ", 401);
  const token = authorization?.slice(7) || sessionTokenFrom(request);
  if (!token) throw new AppError("UNAUTHORIZED", "Yêu cầu đăng nhập", 401);
  const session = await runtime.store.resolveSession(token);
  if (!session || session.user.status === "BLOCKED") throw new AppError("UNAUTHORIZED", "Phiên đăng nhập không hợp lệ", 401);
  return { userId: session.user.id, token };
}

export function requirePersistentDatabase(): ReturnType<typeof getPrisma> {
  if (!process.env.DATABASE_URL) throw new AppError("INTERNAL_ERROR", "Chức năng tài khoản cần cơ sở dữ liệu", 503);
  return getPrisma();
}

export function uuidParam(value: string, field = "id"): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new AppError("VALIDATION_ERROR", `${field} không phải UUID hợp lệ`, 400);
  return value;
}

export function assertStrongPassword(value: string): void {
  if (value.length < 8 || value.length > 128 || !/[A-Za-z]/.test(value) || !/\d/.test(value)) throw new AppError("VALIDATION_ERROR", "Mật khẩu phải có 8–128 ký tự, gồm chữ và số", 400);
}

export function optionalHttpsUrl(value: unknown, field: string): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 2_048) throw new AppError("VALIDATION_ERROR", `${field} không hợp lệ`, 400);
  let url: URL;
  try { url = new URL(value); } catch { throw new AppError("VALIDATION_ERROR", `${field} không hợp lệ`, 400); }
  if (url.protocol !== "https:") throw new AppError("VALIDATION_ERROR", `${field} phải dùng HTTPS`, 400);
  return url.toString();
}

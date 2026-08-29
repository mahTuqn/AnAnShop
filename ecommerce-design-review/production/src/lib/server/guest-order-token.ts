import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "@/modules/shared";

type GuestOrderClaims = { orderId: string; code: string; exp: number };
const encode = (value: string) => Buffer.from(value).toString("base64url");
const secret = () => {
  const value = process.env.ORDER_LOOKUP_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") throw new AppError("INTERNAL_ERROR", "Thiếu cấu hình tra cứu đơn khách", 500);
  return "an-an-local-order-lookup-secret";
};
const signature = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function signGuestOrderLookup(orderId: string, code: string, ttlSeconds = 7 * 86_400): string {
  const payload = encode(JSON.stringify({ orderId, code, exp: Math.floor(Date.now() / 1000) + ttlSeconds } satisfies GuestOrderClaims));
  return `${payload}.${signature(payload)}`;
}

export function verifyGuestOrderLookup(token: string): GuestOrderClaims {
  const [payload, supplied] = token.split(".");
  if (!payload || !supplied) throw new AppError("UNAUTHORIZED", "Liên kết tra cứu không hợp lệ", 401);
  const expected = signature(payload); const left = Buffer.from(supplied); const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) throw new AppError("UNAUTHORIZED", "Liên kết tra cứu không hợp lệ", 401);
  let claims: GuestOrderClaims;
  try { claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as GuestOrderClaims; } catch { throw new AppError("UNAUTHORIZED", "Liên kết tra cứu không hợp lệ", 401); }
  if (!claims.orderId || !claims.code || !Number.isSafeInteger(claims.exp) || claims.exp <= Math.floor(Date.now() / 1000)) throw new AppError("UNAUTHORIZED", "Liên kết tra cứu đã hết hạn", 401);
  return claims;
}

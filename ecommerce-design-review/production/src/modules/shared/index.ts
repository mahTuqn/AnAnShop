export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "OUT_OF_STOCK"
  | "INVALID_COUPON"
  | "PAYMENT_FAILED"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: AppError };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const err = <T = never>(error: AppError): Result<T> => ({ ok: false, error });

export type Vnd = number & { readonly __brand: "VND" };

export function vnd(value: number, field = "amount"): Vnd {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new AppError("VALIDATION_ERROR", `${field} phải là số nguyên VND không âm`, 400, { field });
  }
  return value as Vnd;
}

export const addMoney = (...values: Vnd[]): Vnd => vnd(values.reduce((sum, value) => sum + value, 0));
export const subtractMoney = (left: Vnd, right: Vnd): Vnd => vnd(Math.max(0, left - right));
export const multiplyMoney = (amount: Vnd, quantity: number): Vnd => vnd(amount * positiveInt(quantity, "quantity"));

export function object(input: unknown, message = "Dữ liệu không hợp lệ"): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AppError("VALIDATION_ERROR", message, 400);
  }
  return input as Record<string, unknown>;
}

export function stringField(record: Record<string, unknown>, field: string, options: { min?: number; max?: number; optional?: boolean } = {}): string | undefined {
  const value = record[field];
  if ((value === undefined || value === null || value === "") && options.optional) return undefined;
  if (typeof value !== "string") throw new AppError("VALIDATION_ERROR", `${field} phải là chuỗi`, 400, { field });
  const normalized = value.trim();
  if (normalized.length < (options.min ?? 1) || normalized.length > (options.max ?? 10_000)) {
    throw new AppError("VALIDATION_ERROR", `${field} có độ dài không hợp lệ`, 400, { field });
  }
  return normalized;
}

export function positiveInt(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new AppError("VALIDATION_ERROR", `${field} phải là số nguyên dương`, 400, { field });
  }
  return value as number;
}

export function email(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || normalized.length > 320) {
    throw new AppError("VALIDATION_ERROR", "Email không hợp lệ", 400, { field: "email" });
  }
  return normalized;
}

export function uuid(_prefix = "id"): string {
  return crypto.randomUUID();
}

export interface Clock { now(): Date }
export const systemClock: Clock = { now: () => new Date() };


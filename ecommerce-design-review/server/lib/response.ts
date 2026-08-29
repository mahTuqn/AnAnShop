// Standard API response and error helpers
import type { Response } from "express";

export interface ApiEnvelope<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function ok<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data } satisfies ApiEnvelope<T>);
}

export function paginated<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number
): void {
  res.status(200).json({
    success: true,
    data,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  } satisfies ApiEnvelope<T[]>);
}

export function fail(res: Response, status: number, message: string, code?: string): void {
  res.status(status).json({ success: false, error: message, code } satisfies ApiEnvelope);
}

export function notFound(res: Response, entity = "Resource"): void {
  fail(res, 404, `${entity} not found`, "NOT_FOUND");
}

export function unauthorized(res: Response, msg = "Unauthorized"): void {
  fail(res, 401, msg, "UNAUTHORIZED");
}

export function forbidden(res: Response, msg = "Forbidden"): void {
  fail(res, 403, msg, "FORBIDDEN");
}

export function badRequest(res: Response, msg: string): void {
  fail(res, 400, msg, "BAD_REQUEST");
}

export function conflict(res: Response, msg: string): void {
  fail(res, 409, msg, "CONFLICT");
}

// Parse pagination query params
export function parsePagination(query: Record<string, unknown>): { page: number; limit: number; offset: number } {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

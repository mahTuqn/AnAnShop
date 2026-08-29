// Auth middleware — parse JWT from httpOnly cookie or Authorization header
import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "../lib/jwt.js";
import { unauthorized, forbidden } from "../lib/response.js";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) { unauthorized(res); return; }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    unauthorized(res, "Invalid or expired session");
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token) {
    try { req.user = verifyToken(token); } catch { /* ignore */ }
  }
  next();
}

export function requirePermission(...permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) { unauthorized(res); return; }
    const hasAll = permissions.every(p => req.user!.permissions.includes(p));
    if (!hasAll) { forbidden(res, `Missing required permissions: ${permissions.join(", ")}`); return; }
    next();
  };
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) { unauthorized(res); return; }
    const hasAny = roles.some(r => req.user!.roles.includes(r));
    if (!hasAny) { forbidden(res, "Insufficient role"); return; }
    next();
  };
}

function extractToken(req: Request): string | null {
  const cookieToken = req.cookies?.anan_session as string | undefined;
  if (cookieToken) return cookieToken;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  return null;
}

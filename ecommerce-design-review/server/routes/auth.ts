// Auth routes: register, login, logout, forgot-password, reset-password, me
import { Router, type Request, type Response } from "express";
import argon2 from "argon2";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { query, withTransaction } from "../lib/db.js";
import { signToken } from "../lib/jwt.js";
import { ok, badRequest, unauthorized, conflict, fail } from "../lib/response.js";
import { requireAuth } from "../middleware/auth.js";
import { writeAudit } from "../services/audit.js";

const router = Router();

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// ── Register ────────────────────────────────────────────────────────────────
const RegisterSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().regex(/^(0|\+84)\d{9}$/).optional(),
  password: z.string().min(8),
}).refine(d => d.email || d.phone, { message: "Email or phone is required" });

router.post("/register", async (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) { badRequest(res, parsed.error.errors[0].message); return; }
  const { fullName, email, phone, password } = parsed.data;

  // Check duplicate
  const dup = await query(
    `SELECT id FROM users WHERE (email = LOWER($1) OR phone = $2) AND deleted_at IS NULL LIMIT 1`,
    [email ?? null, phone ?? null]
  );
  if (dup.rowCount) { conflict(res, "Email hoặc số điện thoại đã được đăng ký"); return; }

  const passwordHash = await argon2.hash(password);
  const userId = uuid();

  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO users (id, email, phone, password_hash, full_name, status)
       VALUES ($1, LOWER($2), $3, $4, $5, 'ACTIVE')`,
      [userId, email ?? null, phone ?? null, passwordHash, fullName]
    );
    await writeAudit({ actorUserId: userId, action: "user.register", entityType: "users", entityId: userId }, client);
  });

  ok(res, { message: "Đăng ký thành công" }, 201);
});

// ── Login ───────────────────────────────────────────────────────────────────
const LoginSchema = z.object({
  login: z.string().min(1), // email or phone
  password: z.string().min(1),
});

router.post("/login", async (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) { badRequest(res, "Email/số điện thoại và mật khẩu là bắt buộc"); return; }
  const { login, password } = parsed.data;

  const result = await query(
    `SELECT u.id, u.email, u.phone, u.password_hash, u.full_name, u.status,
            COALESCE(json_agg(DISTINCT r.code) FILTER (WHERE r.code IS NOT NULL), '[]') AS roles,
            COALESCE(json_agg(DISTINCT p.code) FILTER (WHERE p.code IS NOT NULL), '[]') AS permissions
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     LEFT JOIN role_permissions rp ON rp.role_id = r.id
     LEFT JOIN permissions p ON p.id = rp.permission_id
     WHERE (LOWER(u.email) = LOWER($1) OR u.phone = $1) AND u.deleted_at IS NULL
     GROUP BY u.id`,
    [login]
  );

  const user = result.rows[0];
  if (!user) { unauthorized(res, "Email/số điện thoại hoặc mật khẩu không đúng"); return; }
  if (user.status === "BLOCKED") { fail(res, 403, "Tài khoản bị khóa", "ACCOUNT_BLOCKED"); return; }

  const valid = await argon2.verify(user.password_hash, password);
  if (!valid) { unauthorized(res, "Email/số điện thoại hoặc mật khẩu không đúng"); return; }

  const token = signToken({
    userId: user.id,
    email: user.email,
    phone: user.phone,
    roles: user.roles,
    permissions: user.permissions,
  });

  // Update last_login_at
  await query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [user.id]);

  res.cookie("anan_session", token, COOKIE_OPTS);
  ok(res, { user: { id: user.id, fullName: user.full_name, email: user.email, phone: user.phone, roles: user.roles } });
});

// Google OAuth is fail-closed until a verified provider adapter is configured.
router.post("/oauth/google", (_req: Request, res: Response) => {
  fail(res, 501, "Google OAuth chưa được cấu hình", "OAUTH_NOT_CONFIGURED");
});

// Logout
router.post("/logout", requireAuth, async (req: Request, res: Response) => {
  res.clearCookie("anan_session");
  await writeAudit({ actorUserId: req.user!.userId, action: "user.logout", entityType: "users", entityId: req.user!.userId, ipAddress: req.ip });
  ok(res, { message: "Đã đăng xuất" });
});

// ── Me ──────────────────────────────────────────────────────────────────────
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  const result = await query(
    `SELECT id, email, phone, full_name, status, avatar_url, created_at FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [req.user!.userId]
  );
  if (!result.rowCount) { unauthorized(res); return; }
  const u = result.rows[0];
  ok(res, { id: u.id, email: u.email, phone: u.phone, fullName: u.full_name, status: u.status, avatarUrl: u.avatar_url, roles: req.user!.roles });
});

// ── Change Password ──────────────────────────────────────────────────────────
const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

router.post("/change-password", requireAuth, async (req: Request, res: Response) => {
  const parsed = ChangePasswordSchema.safeParse(req.body);
  if (!parsed.success) { badRequest(res, parsed.error.errors[0].message); return; }

  const user = await query("SELECT password_hash FROM users WHERE id = $1", [req.user!.userId]);
  if (!user.rowCount) { unauthorized(res); return; }

  const valid = await argon2.verify(user.rows[0].password_hash, parsed.data.currentPassword);
  if (!valid) { badRequest(res, "Mật khẩu hiện tại không đúng"); return; }

  const newHash = await argon2.hash(parsed.data.newPassword);
  await withTransaction(async (client) => {
    await client.query("UPDATE users SET password_hash = $1 WHERE id = $2", [newHash, req.user!.userId]);
    await writeAudit({ actorUserId: req.user!.userId, action: "user.change_password", entityType: "users", entityId: req.user!.userId }, client);
  });

  ok(res, { message: "Đã đổi mật khẩu thành công" });
});

export default router;

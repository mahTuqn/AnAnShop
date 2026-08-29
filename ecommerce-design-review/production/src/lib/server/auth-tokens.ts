import { createHash, randomBytes } from "node:crypto";
import { AppError } from "@/modules/shared";
import { Pbkdf2PasswordHasher } from "./passwords";
import { getPrisma } from "./prisma";

type OneTimeTokenType = "EMAIL_VERIFICATION" | "PASSWORD_RESET";
type DeliveryResult = { accepted: true; deliveryConfigured: boolean; devToken?: string };

const digest = (token: string) => createHash("sha256").update(token).digest("hex");
const exposeDevToken = () => process.env.NODE_ENV !== "production" && process.env.AUTH_EXPOSE_DEV_TOKENS === "true";

export async function issueOneTimeTokenByEmail(email: string, type: OneTimeTokenType): Promise<DeliveryResult> {
  const db = getPrisma();
  const user = await db.user.findFirst({ where: { email: { equals: email.trim(), mode: "insensitive" }, deletedAt: null }, select: { id: true, email: true } });
  const provider = process.env.EMAIL_DELIVERY_PROVIDER?.trim();
  if (!user?.email) return { accepted: true, deliveryConfigured: Boolean(provider) }; // anti-enumeration
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + (type === "PASSWORD_RESET" ? 30 : 24 * 60) * 60_000);
  await db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("UPDATE auth_tokens SET consumed_at=NOW() WHERE user_id=$1::uuid AND type=$2::token_type AND consumed_at IS NULL", user.id, type);
    await tx.$executeRawUnsafe("INSERT INTO auth_tokens(user_id,type,token_hash,expires_at) VALUES($1::uuid,$2::token_type,$3,$4)", user.id, type, digest(token), expiresAt);
    if (provider) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const path = type === "PASSWORD_RESET" ? "/reset-password" : "/verify-email";
      await tx.$executeRawUnsafe("INSERT INTO notifications(user_id,channel,template_code,recipient,payload,status) VALUES($1::uuid,'EMAIL',$2,$3,$4::jsonb,'PENDING')", user.id, type, user.email, JSON.stringify({ url: `${baseUrl}${path}?token=${encodeURIComponent(token)}`, expiresAt }));
    }
  });
  return { accepted: true, deliveryConfigured: Boolean(provider), ...(exposeDevToken() ? { devToken: token } : {}) };
}

export async function verifyEmailToken(token: string): Promise<{ verified: true }> {
  if (token.length < 32 || token.length > 200) throw new AppError("VALIDATION_ERROR", "Mã xác minh không hợp lệ", 400);
  const db = getPrisma();
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe<Array<{ id: string; user_id: string }>>("SELECT id,user_id FROM auth_tokens WHERE token_hash=$1 AND type='EMAIL_VERIFICATION' AND consumed_at IS NULL AND expires_at>NOW() FOR UPDATE", digest(token));
    const record = rows[0];
    if (!record) throw new AppError("UNAUTHORIZED", "Mã xác minh không hợp lệ hoặc đã hết hạn", 401);
    await tx.user.update({ where: { id: record.user_id }, data: { emailVerifiedAt: new Date(), status: "ACTIVE" } });
    await tx.$executeRawUnsafe("UPDATE auth_tokens SET consumed_at=NOW() WHERE id=$1::uuid", record.id);
    return { verified: true as const };
  }, { isolationLevel: "Serializable" });
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<{ reset: true; sessionsRevoked: true }> {
  if (token.length < 32 || token.length > 200) throw new AppError("VALIDATION_ERROR", "Mã đặt lại mật khẩu không hợp lệ", 400);
  if (newPassword.length < 8 || newPassword.length > 128 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) throw new AppError("VALIDATION_ERROR", "Mật khẩu phải có 8–128 ký tự, gồm chữ và số", 400);
  const hash = await new Pbkdf2PasswordHasher().hash(newPassword);
  const db = getPrisma();
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe<Array<{ id: string; user_id: string }>>("SELECT id,user_id FROM auth_tokens WHERE token_hash=$1 AND type='PASSWORD_RESET' AND consumed_at IS NULL AND expires_at>NOW() FOR UPDATE", digest(token));
    const record = rows[0];
    if (!record) throw new AppError("UNAUTHORIZED", "Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn", 401);
    await tx.user.update({ where: { id: record.user_id }, data: { passwordHash: hash } });
    await tx.$executeRawUnsafe("UPDATE auth_tokens SET consumed_at=NOW() WHERE user_id=$1::uuid AND consumed_at IS NULL AND type IN ('PASSWORD_RESET','REFRESH_TOKEN')", record.user_id);
    await tx.$executeRawUnsafe("INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,after_data) VALUES($1::uuid,'PASSWORD_RESET','USER',$1::uuid,$2::jsonb)", record.user_id, JSON.stringify({ sessionsRevoked: true }));
    return { reset: true as const, sessionsRevoked: true as const };
  }, { isolationLevel: "Serializable" });
}

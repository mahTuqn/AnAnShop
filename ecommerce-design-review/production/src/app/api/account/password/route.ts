import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { assertStrongPassword, requireAccount, requirePersistentDatabase } from "@/lib/server/account";
import { clearSessionCookie } from "@/lib/server/auth-session";
import { safeRoute } from "@/lib/server/http";
import { Pbkdf2PasswordHasher } from "@/lib/server/passwords";
import { AppError, object, stringField } from "@/modules/shared";

export async function POST(request: NextRequest): Promise<NextResponse> {
  return safeRoute(async () => {
    const actor = await requireAccount(request);
    const body = object(await request.json());
    const currentPassword = stringField(body, "currentPassword", { min: 1, max: 128 })!;
    const newPassword = stringField(body, "newPassword", { min: 8, max: 128 })!;
    assertStrongPassword(newPassword);
    if (currentPassword === newPassword) throw new AppError("VALIDATION_ERROR", "Mật khẩu mới phải khác mật khẩu hiện tại", 400);
    const db = requirePersistentDatabase();
    const user = await db.user.findUnique({ where: { id: actor.userId }, select: { passwordHash: true } });
    const passwords = new Pbkdf2PasswordHasher();
    if (!user || !(await passwords.verify(currentPassword, user.passwordHash))) throw new AppError("UNAUTHORIZED", "Mật khẩu hiện tại không đúng", 401);
    const passwordHash = await passwords.hash(newPassword);
    await db.$transaction(async (tx) => {
      await tx.user.update({ where: { id: actor.userId }, data: { passwordHash } });
      await tx.$executeRawUnsafe("UPDATE auth_tokens SET consumed_at=NOW() WHERE user_id=$1::uuid AND type='REFRESH_TOKEN' AND consumed_at IS NULL", actor.userId);
      await tx.$executeRawUnsafe("INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,after_data) VALUES($1::uuid,'PASSWORD_CHANGED','USER',$1::uuid,$2::jsonb)", actor.userId, JSON.stringify({ sessionsRevoked: true, tokenHash: createHash("sha256").update(actor.token).digest("hex").slice(0, 12) }));
    });
    const response = NextResponse.json({ data: { changed: true, sessionsRevoked: true } });
    clearSessionCookie(response);
    return response;
  });
}

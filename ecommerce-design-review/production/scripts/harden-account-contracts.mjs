import { readFileSync, writeFileSync } from "node:fs";

function replace(path, before, after) {
  const source = readFileSync(path, "utf8");
  if (!source.includes(before)) throw new Error(`Expected source not found: ${path}`);
  writeFileSync(path, source.replace(before, after), "utf8");
}

replace("src/lib/server/account.ts", `export function optionalHttpsUrl`, `export function uuidParam(value: string, field = "id"): string {\n  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new AppError("VALIDATION_ERROR", \`${"${field}"} không phải UUID hợp lệ\`, 400);\n  return value;\n}\n\nexport function assertStrongPassword(value: string): void {\n  if (value.length < 8 || value.length > 128 || !/[A-Za-z]/.test(value) || !/\\d/.test(value)) throw new AppError("VALIDATION_ERROR", "Mật khẩu phải có 8–128 ký tự, gồm chữ và số", 400);\n}\n\nexport function optionalHttpsUrl`);

replace("src/modules/auth/index.ts", `if (input.password.length < 8 || input.password.length > 128)`, `if (input.password.length < 8 || input.password.length > 128 || !/[A-Za-z]/.test(input.password) || !/\\d/.test(input.password))`);

replace("src/app/api/account/password/route.ts", `import { requireAccount, requirePersistentDatabase } from "@/lib/server/account";`, `import { assertStrongPassword, requireAccount, requirePersistentDatabase } from "@/lib/server/account";`);
replace("src/app/api/account/password/route.ts", `    if (currentPassword === newPassword)`, `    assertStrongPassword(newPassword);\n    if (currentPassword === newPassword)`);

replace("src/app/api/account/profile/route.ts", `import { object, stringField } from "@/modules/shared";`, `import { AppError, object, stringField } from "@/modules/shared";`);
replace("src/app/api/account/profile/route.ts", `    const avatarUrl = optionalHttpsUrl(body.avatarUrl, "avatarUrl");\n    const user`, `    const avatarUrl = optionalHttpsUrl(body.avatarUrl, "avatarUrl");\n    if (fullName === undefined && phone === undefined && avatarUrl === undefined) throw new AppError("VALIDATION_ERROR", "Không có trường hồ sơ nào để cập nhật", 400);\n    const user`);

replace("src/app/api/account/addresses/[id]/route.ts", `import { requireAccount, requirePersistentDatabase } from "@/lib/server/account";`, `import { requireAccount, requirePersistentDatabase, uuidParam } from "@/lib/server/account";`);
replace("src/app/api/account/addresses/[id]/route.ts", `const id = (await context.params).id; const db`, `const id = uuidParam((await context.params).id, "addressId"); const db`);
replace("src/app/api/account/addresses/[id]/route.ts", `const id = (await context.params).id;\n    const rows`, `const id = uuidParam((await context.params).id, "addressId");\n    const db = requirePersistentDatabase();\n    const rows`);
replace("src/app/api/account/addresses/[id]/route.ts", `const rows = await requirePersistentDatabase().$queryRawUnsafe<Array<{ id: string }>>("DELETE FROM addresses WHERE id=$1::uuid AND user_id=$2::uuid RETURNING id", id, actor.userId);\n    if (!rows[0])`, `const rows = await db.$transaction(async (tx) => {\n      const deleted = await tx.$queryRawUnsafe<Array<{ id: string; is_default: boolean }>>("DELETE FROM addresses WHERE id=$1::uuid AND user_id=$2::uuid RETURNING id,is_default", id, actor.userId);\n      if (deleted[0]?.is_default) await tx.$executeRawUnsafe("UPDATE addresses SET is_default=TRUE WHERE id=(SELECT id FROM addresses WHERE user_id=$1::uuid ORDER BY updated_at DESC LIMIT 1)", actor.userId);\n      return deleted;\n    }, { isolationLevel: "Serializable" });\n    if (!rows[0])`);

replace("src/app/api/account/addresses/route.ts", `      if (value.isDefault) await tx.$executeRawUnsafe`, `      const [{ count }] = await tx.$queryRawUnsafe<Array<{ count: bigint }>>("SELECT COUNT(*)::bigint AS count FROM addresses WHERE user_id=$1::uuid", actor.userId);\n      value.isDefault = value.isDefault || Number(count) === 0;\n      if (value.isDefault) await tx.$executeRawUnsafe`);

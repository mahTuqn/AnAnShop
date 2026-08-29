import { readFileSync, writeFileSync } from "node:fs";

const authPath = "routes/auth.ts";
let auth = readFileSync(authPath, "utf8");
const start = auth.indexOf(`router.post("/oauth/google"`);
const end = auth.indexOf(`router.post("/logout"`, start);
if (start < 0 || end < 0) throw new Error("OAuth route markers not found");
const commentStart = auth.lastIndexOf("//", start);
auth = auth.slice(0, commentStart) + `// Google OAuth is fail-closed until a verified provider adapter is configured.\nrouter.post("/oauth/google", (_req: Request, res: Response) => {\n  fail(res, 501, "Google OAuth chưa được cấu hình", "OAUTH_NOT_CONFIGURED");\n});\n\n// Logout\n` + auth.slice(end);
writeFileSync(authPath, auth, "utf8");

const seedPath = "../database/seed.sql";
let seed = readFileSync(seedPath, "utf8");
const comment = "-- Mật khẩu: Admin@2026 (Argon2 hash — thay bằng hash thực khi deploy)";
if (!seed.includes(comment)) throw new Error("Seed credential marker not found");
seed = seed.replace(comment, "-- Tài khoản mẫu bị BLOCKED; không dùng credential seed trong staging/production.");
const adminStart = seed.indexOf("-- Tài khoản mẫu bị BLOCKED");
const adminEnd = seed.indexOf("ON CONFLICT DO NOTHING;", adminStart);
const adminBlock = seed.slice(adminStart, adminEnd);
if (!adminBlock.includes("'ACTIVE'")) throw new Error("Admin ACTIVE marker not found");
seed = seed.slice(0, adminStart) + adminBlock.replace("'ACTIVE'", "'BLOCKED'") + seed.slice(adminEnd);
writeFileSync(seedPath, seed, "utf8");

import { readFileSync, writeFileSync } from "node:fs";

function replace(path, before, after) {
  const source = readFileSync(path, "utf8");
  if (!source.includes(before)) throw new Error(`Expected source not found: ${path}`);
  writeFileSync(path, source.replace(before, after), "utf8");
}

replace("lib/jwt.ts",
  `const JWT_SECRET = process.env.JWT_SECRET ?? "anan_dev_secret_change_in_production";`,
  `const configuredSecret = process.env.JWT_SECRET;\n+if (process.env.NODE_ENV === "production" && (!configuredSecret || configuredSecret.length < 32)) {\n+  throw new Error("JWT_SECRET must be configured with at least 32 characters in production");\n+}\n+const JWT_SECRET = configuredSecret ?? "anan_local_development_secret_only";`);

const authPath = "routes/auth.ts";
let auth = readFileSync(authPath, "utf8");
const start = auth.indexOf(`router.post("/oauth/google"`);
const end = auth.indexOf(`router.post("/logout"`, start);
if (start < 0 || end < 0) throw new Error("OAuth route markers not found");
const commentStart = auth.lastIndexOf("//", start);
auth = auth.slice(0, commentStart) + `// Google OAuth is fail-closed until a verified provider adapter is configured.\n+router.post("/oauth/google", (_req: Request, res: Response) => {\n+  fail(res, 501, "Google OAuth chưa được cấu hình", "OAUTH_NOT_CONFIGURED");\n+});\n+\n+// Logout\n+` + auth.slice(end);
writeFileSync(authPath, auth, "utf8");

replace("../database/seed.sql", "-- Mật khẩu: Admin@2026 (Argon2 hash — thay bằng hash thực khi deploy)", "-- Tài khoản mẫu bị BLOCKED; không dùng credential seed trong staging/production.");
replace("../database/seed.sql", `  'ACTIVE'\n+) ON CONFLICT DO NOTHING;`, `  'BLOCKED'\n+) ON CONFLICT DO NOTHING;`);

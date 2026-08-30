import { readFileSync, writeFileSync } from "node:fs";

function replace(path, before, after) {
  const source = readFileSync(path, "utf8");
  if (!source.includes(before)) throw new Error(`Expected source not found: ${path}`);
  writeFileSync(path, source.replace(before, after), "utf8");
}

replace("src/modules/auth/index.ts", `    private readonly clock: Clock = systemClock,\n  ) {}`, `    private readonly clock: Clock = systemClock,\n    private readonly config: { requireEmailVerification?: boolean } = {},\n  ) {}`);
replace("src/modules/auth/index.ts", `status: "ACTIVE", createdAt`, `status: this.config.requireEmailVerification ? "PENDING_VERIFICATION" : "ACTIVE", createdAt`);
replace("src/modules/auth/index.ts", `    if (user.status === "BLOCKED") return err`, `    if (user.status === "BLOCKED") return err`);
replace("src/modules/auth/index.ts", `    return ok(await this.sessions.issue(toPublicUser(user)));`, `    if (user.status === "PENDING_VERIFICATION" && this.config.requireEmailVerification) return err(new AppError("FORBIDDEN", "Vui lòng xác minh email trước khi đăng nhập", 403));\n    return ok(await this.sessions.issue(toPublicUser(user)));`);

replace("src/lib/server/runtime-persistent.ts", `new AuthService(store, new Pbkdf2PasswordHasher(), store)`, `new AuthService(store, new Pbkdf2PasswordHasher(), store, undefined, { requireEmailVerification: process.env.AUTH_REQUIRE_EMAIL_VERIFICATION === "true" })`);
replace("src/lib/server/runtime.ts", `new AuthService(store, new Pbkdf2PasswordHasher(), store)`, `new AuthService(store, new Pbkdf2PasswordHasher(), store, undefined, { requireEmailVerification: process.env.AUTH_REQUIRE_EMAIL_VERIFICATION === "true" })`);

replace("src/lib/server/auth-handlers.ts", `    // Account access remains active until mandatory email verification is enabled; the token still\n    // proves email ownership and is never exposed unless the explicit safe development flag is set.\n    if (process.env.DATABASE_URL) await issueOneTimeTokenByEmail(email, "EMAIL_VERIFICATION");\n    return sessionResult(await runtime.auth.login({ email, password }), 201);`, `    const verification = process.env.DATABASE_URL ? await issueOneTimeTokenByEmail(email, "EMAIL_VERIFICATION") : { accepted: true, deliveryConfigured: false };\n    if (registered.value.status === "PENDING_VERIFICATION") return NextResponse.json({ data: { user: registered.value, verification } }, { status: 201 });\n    return sessionResult(await runtime.auth.login({ email, password }), 201);`);

const envPath = ".env.example";
let env = readFileSync(envPath, "utf8");
if (!env.includes("AUTH_REQUIRE_EMAIL_VERIFICATION")) env += `\n# Set true only when EMAIL_DELIVERY_PROVIDER and its worker are configured.\nAUTH_REQUIRE_EMAIL_VERIFICATION="false"\nAUTH_EXPOSE_DEV_TOKENS="false"\nEMAIL_DELIVERY_PROVIDER=""\n`;
writeFileSync(envPath, env, "utf8");

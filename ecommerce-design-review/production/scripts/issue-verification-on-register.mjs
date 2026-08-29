import { readFileSync, writeFileSync } from "node:fs";
const path = "src/lib/server/auth-handlers.ts";
let source = readFileSync(path, "utf8");
source = source.replace(`import { sessionResult } from "./auth-session";`, `import { sessionResult } from "./auth-session";\nimport { issueOneTimeTokenByEmail } from "./auth-tokens";`);
const before = `    if (!registered.ok) return jsonResult(registered, 201);\n    return sessionResult(await runtime.auth.login({ email, password }), 201);`;
const after = `    if (!registered.ok) return jsonResult(registered, 201);\n    // Account access remains active until mandatory email verification is enabled; the token still\n    // proves email ownership and is never exposed unless the explicit safe development flag is set.\n    if (process.env.DATABASE_URL) await issueOneTimeTokenByEmail(email, "EMAIL_VERIFICATION");\n    return sessionResult(await runtime.auth.login({ email, password }), 201);`;
if (!source.includes(before)) throw new Error("Register handler block not found");
writeFileSync(path, source.replace(before, after), "utf8");

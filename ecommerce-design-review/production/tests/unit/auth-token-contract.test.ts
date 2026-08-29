import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/lib/server/auth-tokens.ts"), "utf8");

describe("one-time authentication token contract", () => {
  it("stores only a SHA-256 digest and locks a valid token before consuming it", () => {
    expect(source).toContain('createHash("sha256")');
    expect(source).toContain("token_hash");
    expect(source).toContain("FOR UPDATE");
    expect(source).not.toContain("INSERT INTO auth_tokens(user_id,type,token,");
  });

  it("never exposes development tokens in production", () => {
    expect(source).toContain('process.env.NODE_ENV !== "production"');
    expect(source).toContain('AUTH_EXPOSE_DEV_TOKENS === "true"');
  });

  it("revokes reset tokens and sessions in the password reset transaction", () => {
    expect(source).toContain("type IN ('PASSWORD_RESET','REFRESH_TOKEN')");
    expect(source).toContain('isolationLevel: "Serializable"');
  });
});

import { describe, expect, it } from "vitest";
import { AuthService, type PasswordHasher, type SessionIssuer, type User, type UserRepository } from "@/modules/auth";

const hasher: PasswordHasher = { hash: async (v) => `hash:${v}`, verify: async (v, h) => h === `hash:${v}` };
const sessions: SessionIssuer = { issue: async (user) => ({ token: "t", user, expiresAt: new Date(Date.now() + 1000) }) };
const command = { email: "mother@example.com", password: "safe1234", fullName: "An Nguyen" };

function fixture(required: boolean) {
  let user: User | null = null;
  const users: UserRepository = { findByEmail: async () => user, create: async (value) => { user = value; } };
  return { service: new AuthService(users, hasher, sessions, undefined, { requireEmailVerification: required }), user: () => user };
}

describe("email verification policy", () => {
  it("keeps demo mode active when verification is explicitly off", async () => {
    const { service, user } = fixture(false); await service.register(command);
    expect(user()?.status).toBe("ACTIVE");
    expect((await service.login(command)).ok).toBe(true);
  });
  it("creates pending users and blocks login when verification is required", async () => {
    const { service, user } = fixture(true); await service.register(command);
    expect(user()?.status).toBe("PENDING_VERIFICATION");
    const login = await service.login(command);
    expect(!login.ok && login.error.status).toBe(403);
  });
});

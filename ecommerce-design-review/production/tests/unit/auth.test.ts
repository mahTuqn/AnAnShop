import { describe, expect, it } from "vitest";
import { AuthService, type AuthSession, type PasswordHasher, type PublicUser, type SessionIssuer, type User, type UserRepository } from "@/modules/auth";

describe("AuthService", () => {
  it("chuẩn hóa email và không trả password hash", async () => {
    const records: User[] = [];
    const users: UserRepository = { findByEmail: async (email) => records.find((user) => user.email === email) ?? null, create: async (user) => { records.push(user); } };
    const hasher: PasswordHasher = { hash: async (value) => `hash:${value}`, verify: async (value, hash) => hash === `hash:${value}` };
    const sessions: SessionIssuer = { issue: async (user: PublicUser): Promise<AuthSession> => ({ token: "token", user, expiresAt: new Date("2027-01-01") }) };
    const service = new AuthService(users, hasher, sessions, { now: () => new Date("2026-08-28") });
    const result = await service.register({ email: "  Mother@Example.com ", password: "safe-pass-123", fullName: "An Nguyễn" });
    expect(result.ok).toBe(true);
    expect(records[0].email).toBe("mother@example.com");
    expect(records[0].status).toBe("ACTIVE");
    expect(result.ok && "passwordHash" in result.value).toBe(false);
  });
});


import { pbkdf2 as pbkdf2Callback, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { PasswordHasher } from "@/modules/auth";

const pbkdf2 = promisify(pbkdf2Callback);

export class Pbkdf2PasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16);
    const digest = await pbkdf2(password, salt, 210_000, 32, "sha256");
    return `pbkdf2-sha256$210000$${salt.toString("base64url")}$${digest.toString("base64url")}`;
  }
  async verify(password: string, encoded: string): Promise<boolean> {
    const [algorithm, roundsText, saltText, expectedText] = encoded.split("$");
    if (algorithm !== "pbkdf2-sha256" || !roundsText || !saltText || !expectedText) return false;
    const rounds = Number(roundsText);
    if (!Number.isSafeInteger(rounds) || rounds < 100_000 || rounds > 1_000_000) return false;
    const expected = Buffer.from(expectedText, "base64url");
    const actual = await pbkdf2(password, Buffer.from(saltText, "base64url"), rounds, expected.length, "sha256");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
}


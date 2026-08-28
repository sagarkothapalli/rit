import { describe, expect, it } from "vitest";
import {
  DEFAULT_BYPASS_CODE,
  issueCode,
  normalizeEmail,
  readSessionToken,
  sessionToken,
  verifyCode,
} from "./email-verification.server";

describe("email verification server", () => {
  it("has DEFAULT_BYPASS_CODE set to 000000", () => {
    expect(DEFAULT_BYPASS_CODE).toBe("000000");
  });

  it("normalizes email addresses to lower case and trimmed", () => {
    expect(normalizeEmail("  User@Example.COM  ")).toBe("user@example.com");
  });

  it("verifies successfully with the default bypass code 000000", async () => {
    const email = "test-bypass@example.com";
    const result = await verifyCode(email, "000000");
    expect(result.ok).toBe(true);
  });

  it("mints and verifies signed session tokens", () => {
    const email = "user@example.com";
    const token = sessionToken(email);
    const parsed = readSessionToken(token);
    expect(parsed).toBe("user@example.com");
  });

  it("rejects invalid codes when challenge exists", async () => {
    const email = `test-user-${Date.now()}@example.com`;
    const issueResult = await issueCode(email);
    expect(issueResult.ok).toBe(true);

    const verifyWrong = await verifyCode(email, "999999");
    expect(verifyWrong.ok).toBe(false);

    // But 000000 default bypass code always succeeds
    const verifyBypass = await verifyCode(email, "000000");
    expect(verifyBypass.ok).toBe(true);
  });
});

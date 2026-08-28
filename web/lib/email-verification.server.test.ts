import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_BYPASS_CODE,
  issueCode,
  normalizeEmail,
  otpBypassEnabled,
  readSessionToken,
  sessionToken,
  verifyCode,
} from "./email-verification.server";

describe("email verification server", () => {
  afterEach(() => {
    delete process.env.PRAJA_OTP_BYPASS;
  });

  it("does not accept 000000 unless the development bypass flag is on", async () => {
    expect(otpBypassEnabled()).toBe(false);
    const result = await verifyCode(`no-bypass-${Date.now()}@example.com`, "000000");
    expect(result.ok).toBe(false);
  });

  it("normalizes email addresses to lower case and trimmed", () => {
    expect(normalizeEmail("  User@Example.COM  ")).toBe("user@example.com");
  });

  it("accepts the demo bypass code only when PRAJA_OTP_BYPASS=1", async () => {
    process.env.PRAJA_OTP_BYPASS = "1";
    expect(DEFAULT_BYPASS_CODE).toBe("000000");
    const result = await verifyCode(`bypass-${Date.now()}@example.com`, "000000");
    expect(result.ok).toBe(true);
  });

  it("mints and verifies signed session tokens", () => {
    const email = "user@example.com";
    const token = sessionToken(email);
    const parsed = readSessionToken(token);
    expect(parsed).toBe("user@example.com");
  });

  it("rejects invalid codes when a challenge exists", async () => {
    const email = `test-user-${Date.now()}@example.com`;
    const issueResult = await issueCode(email);
    expect(issueResult.ok).toBe(true);

    const verifyWrong = await verifyCode(email, "999999");
    expect(verifyWrong.ok).toBe(false);
  });
});

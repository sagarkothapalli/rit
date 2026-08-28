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

  it("rejects 000000 when PRAJA_OTP_BYPASS=0", async () => {
    process.env.PRAJA_OTP_BYPASS = "0";
    expect(otpBypassEnabled()).toBe(false);
    const result = await verifyCode(`no-bypass-${Date.now()}@example.com`, "000000");
    expect(result.ok).toBe(false);
  });

  it("normalizes email addresses to lower case and trimmed", () => {
    expect(normalizeEmail("  User@Example.COM  ")).toBe("user@example.com");
  });

  it("accepts 000000 and 0000 by default, with no challenge pending", async () => {
    expect(otpBypassEnabled()).toBe(true);
    expect(DEFAULT_BYPASS_CODE).toBe("000000");
    expect((await verifyCode(`bypass-${Date.now()}@example.com`, "000000")).ok).toBe(true);
    expect((await verifyCode(`bypass-short-${Date.now()}@example.com`, "0000")).ok).toBe(true);
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

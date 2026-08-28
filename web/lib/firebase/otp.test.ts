import { beforeEach, describe, expect, it } from "vitest";
import {
  clearChallenge,
  clearFirebaseSession,
  generateOtpCode,
  getFirebaseVerifiedEmail,
  requestFirebaseEmailOtp,
  setFirebaseVerifiedEmail,
  verifyFirebaseEmailOtp,
} from "./otp";

describe("Firebase OTP Service", () => {
  beforeEach(() => {
    clearFirebaseSession();
    clearChallenge();
  });

  it("generates a valid 6-digit OTP code", () => {
    const code = generateOtpCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it("reports that this build cannot email a code, and hands the code back instead", async () => {
    const email = "citizen@example.com";
    const outcome = await requestFirebaseEmailOtp(email);

    expect(outcome.delivery).toBe("console");
    expect(outcome.devCode).toMatch(/^\d{6}$/);
    expect(outcome.notice).toContain("0000");
  });

  it("verifies with bypass code 0000 and records the verified session", async () => {
    const email = "user@praja.in";
    await requestFirebaseEmailOtp(email);

    await verifyFirebaseEmailOtp(email, "0000");
    expect(getFirebaseVerifiedEmail()).toBe("user@praja.in");
  });

  it("verifies with bypass code 000000 and records the verified session", async () => {
    const email = "citizen@praja.in";
    await requestFirebaseEmailOtp(email);

    await verifyFirebaseEmailOtp(email, "000000");
    expect(getFirebaseVerifiedEmail()).toBe("citizen@praja.in");
  });

  it("rejects an invalid OTP code and decrements remaining attempts", async () => {
    const email = "user@praja.in";
    await requestFirebaseEmailOtp(email);

    await expect(verifyFirebaseEmailOtp(email, "999999")).rejects.toThrow(/4 attempts left/);
  });

  it("locks out after 5 failed attempts", async () => {
    const email = "test@example.com";
    await requestFirebaseEmailOtp(email);

    for (let i = 0; i < 4; i++) {
      await expect(verifyFirebaseEmailOtp(email, "123456")).rejects.toThrow();
    }

    // 5th attempt exhausts allowed attempts
    await expect(verifyFirebaseEmailOtp(email, "123456")).rejects.toThrow(/Too many incorrect attempts/);

    // Subsequent attempt requires requesting a new code
    await expect(verifyFirebaseEmailOtp(email, "123456")).rejects.toThrow(/No verification code is pending/);
  });

  it("clears session and challenge when signing out", async () => {
    setFirebaseVerifiedEmail("citizen@example.com");
    expect(getFirebaseVerifiedEmail()).toBe("citizen@example.com");

    clearFirebaseSession();
    expect(getFirebaseVerifiedEmail()).toBeNull();
  });
});

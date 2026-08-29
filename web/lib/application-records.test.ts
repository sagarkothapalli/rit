import { describe, expect, it } from "vitest";
import { DEMO_CODE, signOutEmail, verifiedEmail, verifyEmailCode } from "./application-records";

describe("email verification", () => {
  it("accepts 0000 and nothing else", async () => {
    expect(DEMO_CODE).toBe("0000");
    await expect(verifyEmailCode("a@b.com", "1234")).rejects.toThrow();
    await expect(verifyEmailCode("a@b.com", "4000")).rejects.toThrow();
    await verifyEmailCode("A@B.com", "0000");
    expect(await verifiedEmail()).toBe("a@b.com");
  });

  it("forgets the address on sign out", async () => {
    await verifyEmailCode("a@b.com", "0000");
    await signOutEmail();
    expect(await verifiedEmail()).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { signOutEmail, verifiedEmail, verifyEmailCode } from "./application-records";

describe("email verification", () => {
  it("accepts 0000 and 4000 and nothing else", async () => {
    await expect(verifyEmailCode("a@b.com", "1234")).rejects.toThrow();
    await verifyEmailCode("A@B.com", "0000");
    expect(await verifiedEmail()).toBe("a@b.com");
    await verifyEmailCode("c@d.com", "4000");
    expect(await verifiedEmail()).toBe("c@d.com");
  });

  it("forgets the address on sign out", async () => {
    await verifyEmailCode("a@b.com", "0000");
    await signOutEmail();
    expect(await verifiedEmail()).toBeNull();
  });
});

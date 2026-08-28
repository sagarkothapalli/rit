import { describe, expect, it } from "vitest";
import { assertCaseId, hashAccessToken, hashesEqual, isCaseId, makeAccessToken, makePrajaReference } from "./id";

describe("case ids and access tokens", () => {
  it("accepts only UUIDs", () => {
    expect(isCaseId("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isCaseId("../etc/passwd")).toBe(false);
    expect(isCaseId("..%2Fsecret")).toBe(false);
    expect(isCaseId("not-a-uuid")).toBe(false);
    expect(() => assertCaseId("../../../tmp/x")).toThrow();
  });

  it("does not derive the recovery token from the Praja reference", async () => {
    const reference = makePrajaReference("RTI_REQUEST");
    const token = makeAccessToken();
    expect(token).not.toBe(reference);
    expect(await hashAccessToken(token)).not.toBe(await hashAccessToken(reference));
    expect(hashesEqual(await hashAccessToken(token), await hashAccessToken(token))).toBe(true);
    expect(hashesEqual("aa", "ab")).toBe(false);
  });
});

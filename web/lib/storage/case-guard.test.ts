import { describe, expect, it } from "vitest";
import { assertOwnedWrite, CaseWriteIdentity } from "./case-guard";
import type { CaseRecord } from "@/lib/domain/case";

function stub(partial: Partial<CaseRecord>): CaseRecord {
  return {
    id: "550e8400-e29b-41d4-a716-446655440000",
    ownerEmail: "owner@example.com",
    prajaReference: "PRTI/ACK/26/ABCDEFGH2",
    accessTokenHash: "a".repeat(64),
    ...partial,
  } as CaseRecord;
}

describe("owned writes", () => {
  it("rejects a write that hijacks another owner's case", () => {
    const existing = stub({ ownerEmail: "owner@example.com" });
    const incoming = stub({ ownerEmail: "intruder@example.com" });
    expect(assertOwnedWrite(existing, incoming, "intruder@example.com")?.error).toBe("FORBIDDEN");
  });

  it("rejects a body whose owner email does not match the actor", () => {
    const incoming = stub({ ownerEmail: "other@example.com" });
    expect(assertOwnedWrite(null, incoming, "owner@example.com")?.error).toBe("EMAIL_MISMATCH");
  });

  it("rejects path-like identifiers", () => {
    const parsed = CaseWriteIdentity.safeParse({
      id: "../etc/passwd",
      ownerEmail: "owner@example.com",
      prajaReference: "PRTI/ACK/26/ABCDEFGH2",
      caseType: "RTI_REQUEST",
    });
    expect(parsed.success).toBe(false);
  });
});

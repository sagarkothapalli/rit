import { describe, expect, it } from "vitest";
import { extractAppealFacts } from "./extract";
import { complaintErrors, firstAppealErrors } from "./validate";
import { emptyComplaintDraft, emptyFirstAppealDraft } from "@/lib/storage/factory";

describe("appeal extraction and validation", () => {
  it("extracts dates, references, and a likely ground from spoken text", () => {
    const facts = extractAppealFacts(
      "I filed RTI/MOH/2025/12345 on 12/01/2026 and they did not reply.",
    );
    expect(facts.groundHint).toBe("NO_RESPONSE");
    expect(facts.registrationNumbers.length).toBeGreaterThan(0);
    expect(facts.dates.length).toBeGreaterThan(0);
    expect(facts.grounds.toLowerCase()).toContain("no response");
  });

  it("requires a delay explanation when the first appeal is late", () => {
    const draft = emptyFirstAppealDraft();
    draft.ground = "NO_RESPONSE";
    draft.originalRegistrationNumber = "RTI/1";
    draft.originalFiledAt = "2025-01-01";
    draft.noResponse = true;
    draft.background = "Background";
    draft.groundsAndRelief = "Relief";
    const errors = firstAppealErrors(draft, null, { late: true });
    expect(errors.some((item) => /delay explanation/i.test(item))).toBe(true);
  });
});

describe("complaints", () => {
  it("does not address an unclear-jurisdiction complaint to the CIC", () => {
    const draft = emptyComplaintDraft();
    draft.ground = "UNABLE_TO_SUBMIT";
    draft.unableToSubmitReason = "No PIO";
    draft.facts = "Facts";
    draft.relief = "Relief";
    expect(complaintErrors(draft, "UNCLEAR").some((item) => /Central or State/i.test(item))).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { applyCaseEvent, deadlinesOnFiling, requestResponseKindFor } from "./lifecycle";
import { CENTRAL_REQUEST_RULES } from "@/lib/filing-rules/registry";
import { createBlankCase } from "@/lib/storage/factory";
import type { CaseEvent } from "@/lib/domain/events";

function event(partial: Partial<CaseEvent>): CaseEvent {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    caseId: "case",
    officialReferenceId: "22222222-2222-4222-8222-222222222222",
    eventType: "FILING_RECORDED",
    source: "USER_REPORTED",
    occurredAt: "2026-01-01",
    recordedAt: "2026-01-01T00:00:00.000Z",
    payload: {},
    createdBy: "owner@example.com",
    idempotencyKey: "t",
    ...partial,
  };
}

describe("lifecycle deadlines", () => {
  it("uses life-or-liberty and third-party flags on the original request", async () => {
    const record = await createBlankCase({ caseType: "RTI_REQUEST", ownerEmail: "a@b.com" });
    if (record.draft.payload.kind === "RTI_REQUEST") {
      record.draft.payload.lifeOrLiberty = true;
    }
    expect(requestResponseKindFor(record)).toBe("LIFE_LIBERTY_RESPONSE");
    const deadlines = deadlinesOnFiling(record, "2026-01-01", "22222222-2222-4222-8222-222222222222", CENTRAL_REQUEST_RULES, "USER_REPORTED");
    expect(deadlines[0].kind).toBe("LIFE_LIBERTY_RESPONSE");
  });

  it("does not start a second-appeal limitation from the date the second appeal was filed", async () => {
    const record = await createBlankCase({ caseType: "SECOND_APPEAL", ownerEmail: "a@b.com" });
    const next = applyCaseEvent(record, event({ eventType: "FILING_RECORDED", occurredAt: "2026-04-01" }));
    expect(next.deadlines.some((item) => item.kind === "SECOND_APPEAL_LIMITATION")).toBe(false);
  });

  it("does not start a 30-day RTI response when a Section 18 complaint is filed", async () => {
    const record = await createBlankCase({ caseType: "SECTION_18_COMPLAINT", ownerEmail: "a@b.com" });
    const next = applyCaseEvent(record, event({ eventType: "FILING_RECORDED" }));
    expect(next.deadlines.some((item) => item.kind === "REQUEST_RESPONSE")).toBe(false);
  });

  it("satisfies the response deadline when a reply is recorded", async () => {
    const record = await createBlankCase({ caseType: "RTI_REQUEST", ownerEmail: "a@b.com" });
    const filed = applyCaseEvent(record, event({ eventType: "FILING_RECORDED", idempotencyKey: "f" }));
    expect(filed.deadlines.some((item) => item.kind === "REQUEST_RESPONSE" && item.status !== "SATISFIED")).toBe(true);
    const replied = applyCaseEvent(
      filed,
      event({
        id: "33333333-3333-4333-8333-333333333333",
        eventType: "REPLY_RECEIVED",
        occurredAt: "2026-01-20",
        idempotencyKey: "r",
      }),
    );
    expect(replied.deadlines.find((item) => item.kind === "REQUEST_RESPONSE")?.status).toBe("SATISFIED");
    expect(replied.deadlines.some((item) => item.kind === "FIRST_APPEAL_LIMITATION")).toBe(true);
  });

  it("pauses the response clock on an additional-fee demand and restarts it when paid", async () => {
    const record = await createBlankCase({ caseType: "RTI_REQUEST", ownerEmail: "a@b.com" });
    const filed = applyCaseEvent(record, event({ eventType: "FILING_RECORDED", idempotencyKey: "f" }));
    const demanded = applyCaseEvent(
      filed,
      event({ eventType: "ADDITIONAL_FEE_DEMAND", id: "44444444-4444-4444-8444-444444444444", idempotencyKey: "d" }),
    );
    expect(demanded.deadlines.find((item) => item.kind === "REQUEST_RESPONSE")?.status).toBe("NOT_STARTED");
    const paid = applyCaseEvent(
      demanded,
      event({ eventType: "ADDITIONAL_FEE_PAID", id: "55555555-5555-4555-8555-555555555555", occurredAt: "2026-01-10", idempotencyKey: "p" }),
    );
    expect(paid.deadlines.find((item) => item.kind === "REQUEST_RESPONSE")?.status).toBe("SATISFIED");
    expect(paid.deadlines.some((item) => item.kind === "ADDITIONAL_FEE")).toBe(true);
  });

  it("keeps the original deadline on a part-transfer and adds a branch deadline", async () => {
    const record = await createBlankCase({ caseType: "RTI_REQUEST", ownerEmail: "a@b.com" });
    const filed = applyCaseEvent(record, event({ eventType: "FILING_RECORDED", idempotencyKey: "f" }));
    const originalOpen = filed.deadlines.filter((item) => item.kind === "REQUEST_RESPONSE" && item.status !== "SATISFIED").length;
    const part = applyCaseEvent(
      filed,
      event({ eventType: "REQUEST_PART_TRANSFERRED", id: "66666666-6666-4666-8666-666666666666", idempotencyKey: "pt" }),
      {
        newReference: {
          id: "77777777-7777-4777-8777-777777777777",
          caseId: filed.id,
          registrationNumber: "T-2",
          referenceKind: "PART_TRANSFER",
          source: "USER_REPORTED",
          filedAt: "2026-01-05",
          receivedAt: "2026-01-05",
          parentOfficialReferenceId: "22222222-2222-4222-8222-222222222222",
          isPrimary: false,
          createdAt: "2026-01-05T00:00:00.000Z",
        },
      },
    );
    const openResponses = part.deadlines.filter((item) => item.kind === "REQUEST_RESPONSE" && item.status !== "SATISFIED");
    expect(openResponses.length).toBe(originalOpen + 1);
  });
});

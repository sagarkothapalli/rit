import { describe, expect, it } from "vitest";
import { applyCaseEvent } from "@/lib/deadlines/lifecycle";
import { createBlankCase } from "@/lib/storage/factory";
import { firstAppealWindow, secondAppealWindow } from "@/lib/deadlines/calculate";
import { CENTRAL_FIRST_APPEAL_RULES, CIC_SECOND_APPEAL_RULES } from "@/lib/filing-rules/registry";

describe("request to first appeal to second appeal", () => {
  it("opens first appeal after deemed refusal and second appeal after FAA silence", async () => {
    const request = await createBlankCase({ caseType: "RTI_REQUEST", ownerEmail: "a@b.com", jurisdiction: "CENTRAL" });
    const filed = applyCaseEvent(request, {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      caseId: request.id,
      officialReferenceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      eventType: "FILING_RECORDED",
      source: "USER_REPORTED",
      occurredAt: "2026-01-01",
      recordedAt: "2026-01-01T00:00:00.000Z",
      payload: {},
      createdBy: "a@b.com",
      idempotencyKey: "req-filed",
    });
    const window1 = firstAppealWindow({
      filedAt: "2026-01-01",
      replyReceivedAt: null,
      rule: CENTRAL_FIRST_APPEAL_RULES,
      asOf: "2026-02-01",
    });
    expect(window1.eligible).toBe(true);

    const first = await createBlankCase({
      caseType: "FIRST_APPEAL",
      ownerEmail: "a@b.com",
      parentCaseId: filed.id,
      jurisdiction: "CENTRAL",
    });
    const firstFiled = applyCaseEvent(first, {
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      caseId: first.id,
      officialReferenceId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      eventType: "FILING_RECORDED",
      source: "USER_REPORTED",
      occurredAt: "2026-02-02",
      recordedAt: "2026-02-02T00:00:00.000Z",
      payload: {},
      createdBy: "a@b.com",
      idempotencyKey: "fa-filed",
    });
    expect(firstFiled.deadlines.some((item) => item.kind === "FAA_DECISION")).toBe(true);

    const window2 = secondAppealWindow({
      faaFiledAt: "2026-02-02",
      faaDecisionAt: null,
      rule: CIC_SECOND_APPEAL_RULES,
      asOf: "2026-03-05",
    });
    expect(window2.eligible).toBe(true);
  });
});

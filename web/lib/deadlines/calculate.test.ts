import { describe, expect, it } from "vitest";
import { CENTRAL_REQUEST_RULES } from "@/lib/filing-rules/registry";
import {
  addDays,
  calculateDeadline,
  compareDay,
  firstAppealWindow,
  secondAppealWindow,
} from "./calculate";

const rule = CENTRAL_REQUEST_RULES;

describe("deadline engine", () => {
  describe("request response (30 days)", () => {
    const start = "2026-01-01";
    const due = addDays(start, 30);

    it("is open the day before the due date", () => {
      const result = calculateDeadline({
        kind: "REQUEST_RESPONSE",
        startDate: start,
        rule,
        source: "USER_REPORTED",
        caseId: "t",
        asOf: addDays(due, -1),
      });
      expect(result.dueAt.slice(0, 10)).toBe("2026-01-31");
      expect(result.status).not.toBe("OVERDUE");
    });

    it("is still due on the exact due date", () => {
      const result = calculateDeadline({
        kind: "REQUEST_RESPONSE",
        startDate: start,
        rule,
        source: "USER_REPORTED",
        caseId: "t",
        asOf: due,
      });
      expect(result.status).not.toBe("OVERDUE");
      expect(compareDay(result.dueAt, due) === 0).toBe(true);
    });

    it("is overdue the day after", () => {
      const result = calculateDeadline({
        kind: "REQUEST_RESPONSE",
        startDate: start,
        rule,
        source: "USER_REPORTED",
        caseId: "t",
        asOf: addDays(due, 1),
      });
      expect(result.status).toBe("OVERDUE");
    });
  });

  describe("life or liberty (48 hours)", () => {
    it("uses the 48-hour path", () => {
      const result = calculateDeadline({
        kind: "LIFE_LIBERTY_RESPONSE",
        startDate: "2026-03-01",
        rule,
        source: "USER_REPORTED",
        caseId: "t",
        lifeOrLiberty: true,
        asOf: "2026-03-01",
      });
      expect(result.explanation).toMatch(/48 hours/);
      expect(result.dueAt.startsWith("2026-03-03")).toBe(true);
    });
  });

  describe("third-party (40 days)", () => {
    const start = "2026-02-01";
    const due = addDays(start, 40);

    it("is not overdue the day before", () => {
      expect(
        calculateDeadline({
          kind: "THIRD_PARTY_RESPONSE",
          startDate: start,
          rule,
          source: "USER_REPORTED",
          caseId: "t",
          thirdParty: true,
          asOf: addDays(due, -1),
        }).status,
      ).not.toBe("OVERDUE");
    });

    it("is not overdue on the due date", () => {
      expect(
        calculateDeadline({
          kind: "THIRD_PARTY_RESPONSE",
          startDate: start,
          rule,
          source: "USER_REPORTED",
          caseId: "t",
          asOf: due,
        }).status,
      ).not.toBe("OVERDUE");
    });

    it("is overdue the day after", () => {
      expect(
        calculateDeadline({
          kind: "THIRD_PARTY_RESPONSE",
          startDate: start,
          rule,
          source: "USER_REPORTED",
          caseId: "t",
          asOf: addDays(due, 1),
        }).status,
      ).toBe("OVERDUE");
    });
  });

  describe("first appeal window", () => {
    it("after a reply, limitation is 30 days from the reply", () => {
      const window = firstAppealWindow({
        filedAt: "2026-01-01",
        replyReceivedAt: "2026-01-20",
        rule,
        asOf: "2026-01-20",
      });
      expect(window.earliest).toBe("2026-01-20");
      expect(window.limitationEnd).toBe("2026-02-19");
      expect(window.eligible).toBe(true);
    });

    it("is in time on the limitation day and late the day after", () => {
      const onTime = firstAppealWindow({
        filedAt: "2026-01-01",
        replyReceivedAt: "2026-01-20",
        rule,
        asOf: "2026-02-19",
      });
      const late = firstAppealWindow({
        filedAt: "2026-01-01",
        replyReceivedAt: "2026-01-20",
        rule,
        asOf: "2026-02-20",
      });
      expect(onTime.eligible).toBe(true);
      expect(late.eligible).toBe(false);
    });

    it("with no reply, becomes eligible when the response period expires", () => {
      const before = firstAppealWindow({
        filedAt: "2026-01-01",
        replyReceivedAt: null,
        rule,
        asOf: "2026-01-30",
      });
      const onDay = firstAppealWindow({
        filedAt: "2026-01-01",
        replyReceivedAt: null,
        rule,
        asOf: "2026-01-31",
      });
      const after = firstAppealWindow({
        filedAt: "2026-01-01",
        replyReceivedAt: null,
        rule,
        asOf: "2026-02-01",
      });
      expect(before.eligible).toBe(false);
      expect(onDay.eligible).toBe(true);
      expect(after.eligible).toBe(true);
    });
  });

  describe("FAA decision and second appeal", () => {
    it("FAA 30-day decision is overdue the day after", () => {
      const start = "2026-03-01";
      const due = addDays(start, 30);
      expect(
        calculateDeadline({
          kind: "FAA_DECISION",
          startDate: start,
          rule,
          source: "USER_REPORTED",
          caseId: "t",
          asOf: addDays(due, -1),
        }).status,
      ).not.toBe("OVERDUE");
      expect(
        calculateDeadline({
          kind: "FAA_DECISION",
          startDate: start,
          rule,
          source: "USER_REPORTED",
          caseId: "t",
          asOf: due,
        }).status,
      ).not.toBe("OVERDUE");
      expect(
        calculateDeadline({
          kind: "FAA_DECISION",
          startDate: start,
          rule,
          source: "USER_REPORTED",
          caseId: "t",
          asOf: addDays(due, 1),
        }).status,
      ).toBe("OVERDUE");
    });

    it("second appeal limitation is 90 days from the FAA decision", () => {
      const onTime = secondAppealWindow({
        faaFiledAt: "2026-01-01",
        faaDecisionAt: "2026-01-15",
        rule,
        asOf: addDays("2026-01-15", 90),
      });
      const late = secondAppealWindow({
        faaFiledAt: "2026-01-01",
        faaDecisionAt: "2026-01-15",
        rule,
        asOf: addDays("2026-01-15", 91),
      });
      expect(onTime.limitationEnd).toBe("2026-04-15");
      expect(onTime.eligible).toBe(true);
      expect(late.eligible).toBe(false);
    });

    it("with no FAA decision, eligibility starts when the FAA period expires", () => {
      const before = secondAppealWindow({
        faaFiledAt: "2026-01-01",
        faaDecisionAt: null,
        rule,
        asOf: "2026-01-30",
      });
      const onDay = secondAppealWindow({
        faaFiledAt: "2026-01-01",
        faaDecisionAt: null,
        rule,
        asOf: "2026-01-31",
      });
      expect(before.eligible).toBe(false);
      expect(onDay.eligible).toBe(true);
    });
  });

  it("labels user-reported dates distinctly from connector-confirmed dates", () => {
    const user = calculateDeadline({
      kind: "REQUEST_RESPONSE",
      startDate: "2026-01-01",
      rule,
      source: "USER_REPORTED",
      caseId: "t",
      asOf: "2026-01-02",
    });
    const connector = calculateDeadline({
      kind: "REQUEST_RESPONSE",
      startDate: "2026-01-01",
      rule,
      source: "OFFICIAL_CONNECTOR",
      caseId: "t",
      asOf: "2026-01-02",
    });
    expect(user.confidence).toBe("user-reported");
    expect(connector.confidence).toBe("connector-confirmed");
    expect(user.explanation).toMatch(/not confirmed/);
    expect(connector.explanation).toMatch(/authorized connector/);
  });
});

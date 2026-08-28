import type { DeadlineKind, DeadlineRecord, DeadlineStatus } from "@/lib/domain/case";
import type { VerificationSource } from "@/lib/domain/status";
import type { FilingRuleSet } from "@/lib/filing-rules/schema";

export interface DeadlineInput {
  kind: DeadlineKind;
  startDate: string;
  rule: FilingRuleSet;
  source: VerificationSource;
  caseId: string;
  officialReferenceId?: string | null;
  lifeOrLiberty?: boolean;
  thirdParty?: boolean;
  asOf?: string;
}

export interface DeadlineResult {
  kind: DeadlineKind;
  startsAt: string;
  dueAt: string;
  status: DeadlineStatus;
  explanation: string;
  source: VerificationSource;
  ruleVersion: string;
  confidence: "user-reported" | "connector-confirmed" | "praja";
  delayExplanationNeeded: boolean;
  limitationEnd: string;
}

const MS_DAY = 86_400_000;

export function parseDay(value: string): Date {
  const day = value.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) throw new Error(`Invalid date: ${value}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

export function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(start: string, days: number): string {
  const date = parseDay(start);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDay(date);
}

export function addHours(start: string, hours: number): string {
  const date = parseDay(start);
  date.setUTCHours(date.getUTCHours() + hours);
  return date.toISOString();
}

export function compareDay(a: string, b: string): number {
  return parseDay(a).getTime() - parseDay(b).getTime();
}

export function daysBetween(start: string, end: string): number {
  return Math.round((parseDay(end).getTime() - parseDay(start).getTime()) / MS_DAY);
}

function statusOn(due: string, asOf: string, satisfied = false): DeadlineStatus {
  if (satisfied) return "SATISFIED";
  const delta = compareDay(due, asOf);
  if (delta < 0) return "OVERDUE";
  if (delta <= 7 * MS_DAY && daysBetween(asOf, due) <= 7) return "DUE_SOON";
  return "OPEN";
}

function confidenceOf(source: VerificationSource): DeadlineResult["confidence"] {
  if (source === "OFFICIAL_CONNECTOR") return "connector-confirmed";
  if (source === "USER_REPORTED") return "user-reported";
  return "praja";
}

function daysFor(kind: DeadlineKind, rule: FilingRuleSet, flags: { lifeOrLiberty?: boolean; thirdParty?: boolean }): { days: number; hours?: number; label: string } {
  if (kind === "LIFE_LIBERTY_RESPONSE" || flags.lifeOrLiberty && kind === "REQUEST_RESPONSE") {
    return { days: 0, hours: rule.deadlines.lifeLibertyHours, label: `${rule.deadlines.lifeLibertyHours} hours because life or liberty is claimed` };
  }
  if (kind === "THIRD_PARTY_RESPONSE" || (flags.thirdParty && kind === "REQUEST_RESPONSE")) {
    return { days: rule.deadlines.thirdPartyDays, label: `${rule.deadlines.thirdPartyDays} days because a third party must be consulted` };
  }
  if (kind === "TRANSFER") return { days: rule.deadlines.transferDays, label: `${rule.deadlines.transferDays} days to transfer under Section 6(3)` };
  if (kind === "FIRST_APPEAL_LIMITATION") {
    return { days: rule.deadlines.firstAppealLimitationDays, label: `${rule.deadlines.firstAppealLimitationDays} days to file a first appeal` };
  }
  if (kind === "FAA_DECISION") {
    return { days: rule.deadlines.faaDecisionDays, label: `${rule.deadlines.faaDecisionDays} days for the First Appellate Authority to decide (extendable by ${rule.deadlines.faaExtensionDays})` };
  }
  if (kind === "SECOND_APPEAL_LIMITATION") {
    return { days: rule.deadlines.secondAppealLimitationDays, label: `${rule.deadlines.secondAppealLimitationDays} days to file a second appeal` };
  }
  if (kind === "ADDITIONAL_FEE") {
    return { days: rule.deadlines.responseDays, label: `${rule.deadlines.responseDays} days after the additional fee is recorded as paid` };
  }
  return { days: rule.deadlines.responseDays, label: `${rule.deadlines.responseDays} days for a response under Section 7` };
}

export function calculateDeadline(input: DeadlineInput): DeadlineResult {
  const asOf = (input.asOf ?? new Date().toISOString()).slice(0, 10);
  const start = input.startDate.slice(0, 10);
  const spec = daysFor(input.kind, input.rule, { lifeOrLiberty: input.lifeOrLiberty, thirdParty: input.thirdParty });
  const dueAt = spec.hours ? addHours(start, spec.hours) : addDays(start, spec.days);
  const dueDay = dueAt.slice(0, 10);
  const status = statusOn(dueDay, asOf);
  const delayExplanationNeeded = status === "OVERDUE" && (input.kind === "FIRST_APPEAL_LIMITATION" || input.kind === "SECOND_APPEAL_LIMITATION");
  const sourceLabel =
    input.source === "OFFICIAL_CONNECTOR"
      ? "Dates confirmed by an authorized connector."
      : input.source === "USER_REPORTED"
        ? "Dates as you recorded them, not confirmed by a government system."
        : "Calculated from Praja records only.";
  const explanation =
    `Started ${start}. Due ${dueDay} (${spec.label}). Rule ${input.rule.id}, verified ${input.rule.verifiedAt}. ${sourceLabel}`;
  return {
    kind: input.kind,
    startsAt: `${start}T00:00:00.000Z`,
    dueAt: spec.hours ? dueAt : `${dueDay}T00:00:00.000Z`,
    status,
    explanation,
    source: input.source,
    ruleVersion: input.rule.id,
    confidence: confidenceOf(input.source),
    delayExplanationNeeded,
    limitationEnd: `${dueDay}T00:00:00.000Z`,
  };
}

export function toDeadlineRecord(id: string, input: DeadlineInput, result = calculateDeadline(input)): DeadlineRecord {
  return {
    id,
    caseId: input.caseId,
    officialReferenceId: input.officialReferenceId ?? null,
    kind: result.kind,
    startsAt: result.startsAt,
    dueAt: result.dueAt,
    ruleVersion: result.ruleVersion,
    status: result.status,
    satisfiedByEventId: null,
    createdAt: new Date().toISOString(),
    explanation: result.explanation,
    source: result.source,
  };
}

export function refreshDeadlineStatus(record: DeadlineRecord, asOf = new Date().toISOString()): DeadlineRecord {
  if (record.status === "SATISFIED") return record;
  return { ...record, status: statusOn(record.dueAt.slice(0, 10), asOf.slice(0, 10)) };
}

export function faaExtendedDue(startDate: string, rule: FilingRuleSet): string {
  return addDays(startDate, rule.deadlines.faaDecisionDays + rule.deadlines.faaExtensionDays);
}

/** First appeal may be filed once the PIO period has expired, or within limitation after a reply. */
export function firstAppealWindow(input: {
  filedAt: string;
  replyReceivedAt: string | null;
  rule: FilingRuleSet;
  lifeOrLiberty?: boolean;
  thirdParty?: boolean;
  asOf?: string;
}): { earliest: string; limitationEnd: string; eligible: boolean; explanation: string } {
  const asOf = (input.asOf ?? new Date().toISOString()).slice(0, 10);
  const response = calculateDeadline({
    kind: input.lifeOrLiberty ? "LIFE_LIBERTY_RESPONSE" : input.thirdParty ? "THIRD_PARTY_RESPONSE" : "REQUEST_RESPONSE",
    startDate: input.filedAt,
    rule: input.rule,
    source: "USER_REPORTED",
    caseId: "preview",
    lifeOrLiberty: input.lifeOrLiberty,
    thirdParty: input.thirdParty,
    asOf,
  });
  if (input.replyReceivedAt) {
    const limitation = calculateDeadline({
      kind: "FIRST_APPEAL_LIMITATION",
      startDate: input.replyReceivedAt,
      rule: input.rule,
      source: "USER_REPORTED",
      caseId: "preview",
      asOf,
    });
    return {
      earliest: input.replyReceivedAt.slice(0, 10),
      limitationEnd: limitation.dueAt.slice(0, 10),
      eligible: compareDay(asOf, limitation.dueAt) <= 0,
      explanation: `Reply recorded ${input.replyReceivedAt.slice(0, 10)}. First appeal limitation ends ${limitation.dueAt.slice(0, 10)}. ${limitation.explanation}`,
    };
  }
  return {
    earliest: response.dueAt.slice(0, 10),
    limitationEnd: addDays(response.dueAt, input.rule.deadlines.firstAppealLimitationDays),
    eligible: compareDay(asOf, response.dueAt) >= 0,
    explanation: `No reply recorded. Response was due ${response.dueAt.slice(0, 10)}. A first appeal can be filed from that date. ${response.explanation}`,
  };
}

export function secondAppealWindow(input: {
  faaFiledAt: string;
  faaDecisionAt: string | null;
  faaDecisionReceivedAt?: string | null;
  rule: FilingRuleSet;
  asOf?: string;
}): { earliest: string; limitationEnd: string; eligible: boolean; explanation: string } {
  const asOf = (input.asOf ?? new Date().toISOString()).slice(0, 10);
  if (input.faaDecisionAt) {
    const start = (input.faaDecisionReceivedAt ?? input.faaDecisionAt).slice(0, 10);
    const limitation = addDays(start, input.rule.deadlines.secondAppealLimitationDays);
    return {
      earliest: start,
      limitationEnd: limitation,
      eligible: compareDay(asOf, limitation) <= 0,
      explanation: `FAA decision dated ${input.faaDecisionAt.slice(0, 10)}. Limitation ends ${limitation} (${input.rule.deadlines.secondAppealLimitationDays} days from receipt). Rule ${input.rule.id}.`,
    };
  }
  const faaDue = addDays(input.faaFiledAt, input.rule.deadlines.faaDecisionDays);
  return {
    earliest: faaDue,
    limitationEnd: addDays(faaDue, input.rule.deadlines.secondAppealLimitationDays),
    eligible: compareDay(asOf, faaDue) >= 0,
    explanation: `No FAA decision recorded. FAA decision was due ${faaDue}. A second appeal can be prepared from that date. Rule ${input.rule.id}.`,
  };
}

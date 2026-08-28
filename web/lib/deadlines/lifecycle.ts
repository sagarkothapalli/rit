import type { CaseEvent } from "@/lib/domain/events";
import type {
  CaseRecord,
  DeadlineKind,
  DeadlineRecord,
  OfficialReference,
} from "@/lib/domain/case";
import type { VerificationSource } from "@/lib/domain/status";
import type { AttachmentRecord } from "@/lib/domain/attachments";
import { filingRulesFor } from "@/lib/filing-rules/registry";
import { newId } from "@/lib/storage/id";
import { refreshDeadlineStatus, toDeadlineRecord, type DeadlineInput } from "./calculate";
import type { FilingRuleSet } from "@/lib/filing-rules/schema";

const RESPONSE_KINDS: DeadlineKind[] = ["REQUEST_RESPONSE", "LIFE_LIBERTY_RESPONSE", "THIRD_PARTY_RESPONSE"];

export function requestFlags(record: CaseRecord): { lifeOrLiberty: boolean; thirdParty: boolean } {
  const payload = record.draft.payload;
  if (payload.kind !== "RTI_REQUEST") return { lifeOrLiberty: false, thirdParty: false };
  return { lifeOrLiberty: payload.lifeOrLiberty, thirdParty: payload.thirdParty };
}

export function requestResponseKindFor(record: CaseRecord): DeadlineKind {
  const flags = requestFlags(record);
  if (flags.lifeOrLiberty) return "LIFE_LIBERTY_RESPONSE";
  if (flags.thirdParty) return "THIRD_PARTY_RESPONSE";
  return "REQUEST_RESPONSE";
}

export function deadlinesOnFiling(
  record: CaseRecord,
  filedAt: string,
  officialReferenceId: string | null,
  rules: FilingRuleSet,
  source: VerificationSource,
): DeadlineRecord[] {
  if (record.caseType === "SECOND_APPEAL" || record.caseType === "SECTION_18_COMPLAINT") return [];
  if (record.caseType === "FIRST_APPEAL") {
    return [
      toDeadlineRecord(newId(), {
        kind: "FAA_DECISION",
        startDate: filedAt,
        rule: rules,
        source,
        caseId: record.id,
        officialReferenceId,
      }),
    ];
  }
  const flags = requestFlags(record);
  const input: DeadlineInput = {
    kind: requestResponseKindFor(record),
    startDate: filedAt,
    rule: rules,
    source,
    caseId: record.id,
    officialReferenceId,
    lifeOrLiberty: flags.lifeOrLiberty,
    thirdParty: flags.thirdParty,
  };
  return [toDeadlineRecord(newId(), input)];
}

function sameBranch(deadline: DeadlineRecord, officialReferenceId: string | null): boolean {
  if (!officialReferenceId || !deadline.officialReferenceId) return true;
  return deadline.officialReferenceId === officialReferenceId;
}

export function satisfyKinds(
  deadlines: DeadlineRecord[],
  kinds: DeadlineKind[],
  eventId: string,
  officialReferenceId: string | null,
  asOf: string,
): DeadlineRecord[] {
  return deadlines.map((deadline) => {
    if (deadline.status === "SATISFIED") return deadline;
    if (!kinds.includes(deadline.kind) || !sameBranch(deadline, officialReferenceId)) {
      return refreshDeadlineStatus(deadline, asOf);
    }
    return { ...deadline, status: "SATISFIED", satisfiedByEventId: eventId };
  });
}

function hasOpen(deadlines: DeadlineRecord[], kind: DeadlineKind, officialReferenceId: string | null): boolean {
  return deadlines.some(
    (item) => item.kind === kind && item.status !== "SATISFIED" && sameBranch(item, officialReferenceId),
  );
}

export interface ApplyEventExtras {
  newReference?: OfficialReference;
  newAttachment?: AttachmentRecord;
}

export function applyCaseEvent(record: CaseRecord, event: CaseEvent, extras: ApplyEventExtras = {}): CaseRecord {
  if (event.idempotencyKey && record.events.some((item) => item.idempotencyKey === event.idempotencyKey)) {
    return record;
  }
  const now = event.recordedAt;
  const rules = filingRulesFor({ caseType: record.caseType, jurisdiction: record.jurisdiction });
  const branch = event.officialReferenceId;
  const next: CaseRecord = {
    ...record,
    updatedAt: now,
    events: [...record.events, event],
    attachments: extras.newAttachment ? [...record.attachments, extras.newAttachment] : record.attachments,
    officialReferences: extras.newReference ? [...record.officialReferences, extras.newReference] : record.officialReferences,
  };

  switch (event.eventType) {
    case "FILING_RECORDED":
      next.filingStatus = event.source === "OFFICIAL_CONNECTOR" ? "CONNECTOR_CONFIRMED_FILED" : "USER_REPORTED_FILED";
      next.outcomeStatus = "AWAITING_RESPONSE";
      next.deadlines = [
        ...next.deadlines,
        ...deadlinesOnFiling(record, event.occurredAt, branch, rules, event.source),
      ];
      break;
    case "REPLY_RECEIVED":
      next.outcomeStatus = "REPLY_RECEIVED";
      next.deadlines = satisfyKinds(next.deadlines, [...RESPONSE_KINDS, "ADDITIONAL_FEE"], event.id, branch, now);
      if (!hasOpen(next.deadlines, "FIRST_APPEAL_LIMITATION", branch)) {
        next.deadlines = [
          ...next.deadlines,
          toDeadlineRecord(newId(), {
            kind: "FIRST_APPEAL_LIMITATION",
            startDate: event.occurredAt,
            rule: rules,
            source: event.source,
            caseId: record.id,
            officialReferenceId: branch,
          }),
        ];
      }
      break;
    case "FAA_DECISION_RECEIVED":
      next.outcomeStatus = "REPLY_RECEIVED";
      next.deadlines = satisfyKinds(next.deadlines, ["FAA_DECISION"], event.id, branch, now);
      if (!hasOpen(next.deadlines, "SECOND_APPEAL_LIMITATION", branch)) {
        next.deadlines = [
          ...next.deadlines,
          toDeadlineRecord(newId(), {
            kind: "SECOND_APPEAL_LIMITATION",
            startDate: event.occurredAt,
            rule: rules,
            source: event.source,
            caseId: record.id,
            officialReferenceId: branch,
          }),
        ];
      }
      break;
    case "ADDITIONAL_FEE_DEMAND":
      next.outcomeStatus = "ACTION_REQUIRED";
      next.deadlines = next.deadlines.map((deadline) => {
        if (
          RESPONSE_KINDS.includes(deadline.kind) &&
          deadline.status !== "SATISFIED" &&
          sameBranch(deadline, branch)
        ) {
          return {
            ...deadline,
            status: "NOT_STARTED",
            explanation: `${deadline.explanation} Paused while an additional fee demand is outstanding.`,
          };
        }
        return deadline;
      });
      break;
    case "ADDITIONAL_FEE_PAID":
      next.outcomeStatus = "AWAITING_RESPONSE";
      next.deadlines = next.deadlines.map((deadline) => {
        if (deadline.status === "NOT_STARTED" && RESPONSE_KINDS.includes(deadline.kind) && sameBranch(deadline, branch)) {
          return { ...deadline, status: "SATISFIED", satisfiedByEventId: event.id };
        }
        return deadline;
      });
      next.deadlines = [
        ...next.deadlines,
        toDeadlineRecord(newId(), {
          kind: "ADDITIONAL_FEE",
          startDate: event.occurredAt,
          rule: rules,
          source: event.source,
          caseId: record.id,
          officialReferenceId: branch,
        }),
      ];
      break;
    case "REQUEST_TRANSFERRED":
      next.deadlines = satisfyKinds(next.deadlines, RESPONSE_KINDS, event.id, branch, now);
      if (extras.newReference) {
        const flags = requestFlags(record);
        next.deadlines = [
          ...next.deadlines,
          toDeadlineRecord(newId(), {
            kind: "TRANSFER",
            startDate: event.occurredAt,
            rule: rules,
            source: event.source,
            caseId: record.id,
            officialReferenceId: extras.newReference.id,
          }),
          toDeadlineRecord(newId(), {
            kind: requestResponseKindFor(record),
            startDate: event.occurredAt,
            rule: rules,
            source: event.source,
            caseId: record.id,
            officialReferenceId: extras.newReference.id,
            lifeOrLiberty: flags.lifeOrLiberty,
            thirdParty: flags.thirdParty,
          }),
        ];
      }
      break;
    case "REQUEST_PART_TRANSFERRED":
      if (extras.newReference) {
        const flags = requestFlags(record);
        next.deadlines = [
          ...next.deadlines,
          toDeadlineRecord(newId(), {
            kind: requestResponseKindFor(record),
            startDate: event.occurredAt,
            rule: rules,
            source: event.source,
            caseId: record.id,
            officialReferenceId: extras.newReference.id,
            lifeOrLiberty: flags.lifeOrLiberty,
            thirdParty: flags.thirdParty,
          }),
        ];
      }
      break;
    case "REQUEST_RETURNED":
      next.filingStatus = "RETURNED";
      next.deadlines = satisfyKinds(next.deadlines, [...RESPONSE_KINDS, "FAA_DECISION"], event.id, branch, now);
      break;
    case "CASE_DISPOSED":
      next.outcomeStatus = "DISPOSED";
      next.deadlines = next.deadlines.map((deadline) =>
        deadline.status === "SATISFIED" ? deadline : { ...deadline, status: "SATISFIED", satisfiedByEventId: event.id },
      );
      break;
    case "CASE_CLOSED":
      next.outcomeStatus = "CLOSED";
      next.deadlines = next.deadlines.map((deadline) =>
        deadline.status === "SATISFIED" ? deadline : { ...deadline, status: "SATISFIED", satisfiedByEventId: event.id },
      );
      break;
    case "SUPPORTING_DOCUMENT_REQUESTED":
      next.outcomeStatus = "ACTION_REQUIRED";
      break;
    default:
      break;
  }

  next.deadlines = next.deadlines.map((deadline) => refreshDeadlineStatus(deadline, now));
  return next;
}

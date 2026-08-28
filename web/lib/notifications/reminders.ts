import type { CaseRecord } from "@/lib/domain/case";
import { deadlineSourceLabel, formatDeadlineDay } from "@/lib/deadlines/explain";
import { isOfficiallyFiled } from "@/lib/domain/status";

export type ReminderTemplate =
  | "PACKET_READY_UNFILED"
  | "RESPONSE_DUE_SOON"
  | "RESPONSE_OVERDUE_APPEAL"
  | "FAA_DUE_SOON"
  | "FAA_OVERDUE"
  | "SECOND_APPEAL_LIMITATION"
  | "ACTION_RECORDED";

export interface Reminder {
  id: string;
  caseId: string;
  template: ReminderTemplate;
  title: string;
  body: string;
  sourceLabel: string;
  dueAt: string | null;
}

export function remindersForCase(record: CaseRecord, now = new Date().toISOString()): Reminder[] {
  if (!record.remindersEnabled) return [];
  const items: Reminder[] = [];
  if (record.preparationStatus === "PACKET_GENERATED" && record.filingStatus === "NOT_FILED") {
    items.push({
      id: `${record.id}:packet-ready`,
      caseId: record.id,
      template: "PACKET_READY_UNFILED",
      title: "Filing packet ready",
      body: "The packet is prepared. Nothing has been filed with the government from this workspace.",
      sourceLabel: "Praja preparation",
      dueAt: null,
    });
  }
  for (const deadline of record.deadlines) {
    const sourceLabel = deadlineSourceLabel(deadline.source);
    if (!isOfficiallyFiled(record.filingStatus) && deadline.kind === "REQUEST_RESPONSE") continue;
    if (deadline.status === "DUE_SOON") {
      items.push({
        id: `${record.id}:${deadline.id}:soon`,
        caseId: record.id,
        template: deadline.kind === "FAA_DECISION" ? "FAA_DUE_SOON" : "RESPONSE_DUE_SOON",
        title: "Deadline approaching",
        body: `Due ${formatDeadlineDay(deadline.dueAt)}. ${deadline.explanation}`,
        sourceLabel,
        dueAt: deadline.dueAt,
      });
    }
    if (deadline.status === "OVERDUE") {
      const appeal = record.caseType === "RTI_REQUEST";
      items.push({
        id: `${record.id}:${deadline.id}:overdue`,
        caseId: record.id,
        template: appeal ? "RESPONSE_OVERDUE_APPEAL" : deadline.kind === "SECOND_APPEAL_LIMITATION" ? "SECOND_APPEAL_LIMITATION" : "FAA_OVERDUE",
        title: appeal ? "Response overdue — a first appeal may be available" : "Deadline passed",
        body: `Due ${formatDeadlineDay(deadline.dueAt)}. ${deadline.explanation}`,
        sourceLabel,
        dueAt: deadline.dueAt,
      });
    }
  }
  if (record.outcomeStatus === "ACTION_REQUIRED") {
    items.push({
      id: `${record.id}:action`,
      caseId: record.id,
      template: "ACTION_RECORDED",
      title: "Action required",
      body: "An additional fee or document request has been recorded on this case.",
      sourceLabel: "You recorded this",
      dueAt: now,
    });
  }
  return items;
}

export function reminderIdempotencyKey(reminder: Reminder): string {
  return `${reminder.caseId}:${reminder.template}:${reminder.dueAt ?? "none"}`;
}

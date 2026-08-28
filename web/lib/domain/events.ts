import type { VerificationSource } from "./status";

export type CaseEventType =
  | "CASE_CREATED"
  | "DRAFT_SAVED"
  | "PACKET_GENERATED"
  | "FILING_RECORDED"
  | "REGISTRATION_RECORDED"
  | "PAYMENT_RECORDED"
  | "PAYMENT_FAILED"
  | "ADDITIONAL_FEE_DEMAND"
  | "ADDITIONAL_FEE_PAID"
  | "SUPPORTING_DOCUMENT_REQUESTED"
  | "SUPPORTING_DOCUMENT_UPLOADED"
  | "REQUEST_RETURNED"
  | "REQUEST_TRANSFERRED"
  | "REQUEST_PART_TRANSFERRED"
  | "REPLY_RECEIVED"
  | "FAA_DECISION_RECEIVED"
  | "COMMISSION_NOTICE_RECEIVED"
  | "APPEAL_FILED"
  | "COMPLAINT_FILED"
  | "CASE_DISPOSED"
  | "CASE_CLOSED"
  | "DEADLINE_SATISFIED"
  | "REMINDER_RESCHEDULED";

export const EVENT_LABEL: Record<CaseEventType, string> = {
  CASE_CREATED: "Case created",
  DRAFT_SAVED: "Draft saved",
  PACKET_GENERATED: "Filing packet generated",
  FILING_RECORDED: "External filing recorded",
  REGISTRATION_RECORDED: "Official registration number recorded",
  PAYMENT_RECORDED: "Payment recorded",
  PAYMENT_FAILED: "Payment recorded as failed",
  ADDITIONAL_FEE_DEMAND: "Additional fee demanded",
  ADDITIONAL_FEE_PAID: "Additional fee paid",
  SUPPORTING_DOCUMENT_REQUESTED: "Supporting document requested",
  SUPPORTING_DOCUMENT_UPLOADED: "Supporting document uploaded",
  REQUEST_RETURNED: "Request returned",
  REQUEST_TRANSFERRED: "Request transferred",
  REQUEST_PART_TRANSFERRED: "Request part-transferred",
  REPLY_RECEIVED: "Reply received",
  FAA_DECISION_RECEIVED: "FAA decision received",
  COMMISSION_NOTICE_RECEIVED: "Commission notice or order received",
  APPEAL_FILED: "Appeal filed",
  COMPLAINT_FILED: "Complaint filed",
  CASE_DISPOSED: "Case disposed",
  CASE_CLOSED: "Case closed",
  DEADLINE_SATISFIED: "Deadline satisfied",
  REMINDER_RESCHEDULED: "Reminder rescheduled",
};

export interface CaseEvent {
  id: string;
  caseId: string;
  officialReferenceId: string | null;
  eventType: CaseEventType;
  source: VerificationSource;
  occurredAt: string;
  recordedAt: string;
  payload: Record<string, unknown>;
  createdBy: string | null;
  idempotencyKey: string | null;
}

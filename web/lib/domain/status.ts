export type CaseType =
  | "RTI_REQUEST"
  | "FIRST_APPEAL"
  | "SECOND_APPEAL"
  | "SECTION_18_COMPLAINT";

export type Jurisdiction = "CENTRAL" | "STATE" | "UNCLEAR";

export type PreparationStatus =
  | "DRAFT"
  | "NEEDS_INFORMATION"
  | "READY_FOR_REVIEW"
  | "READY_TO_FILE"
  | "PACKET_GENERATED";

export type FilingStatus =
  | "NOT_FILED"
  | "EXTERNAL_FILING_IN_PROGRESS"
  | "USER_REPORTED_FILED"
  | "CONNECTOR_CONFIRMED_FILED"
  | "RETURNED";

export type OutcomeStatus =
  | "NONE"
  | "AWAITING_RESPONSE"
  | "ACTION_REQUIRED"
  | "REPLY_RECEIVED"
  | "DISPOSED"
  | "CLOSED";

export type VerificationSource = "PRAJA" | "USER_REPORTED" | "OFFICIAL_CONNECTOR";

export const CASE_TYPE_LABEL: Record<CaseType, string> = {
  RTI_REQUEST: "RTI request",
  FIRST_APPEAL: "First appeal",
  SECOND_APPEAL: "Second appeal",
  SECTION_18_COMPLAINT: "Section 18 complaint",
};

export const PREPARATION_LABEL: Record<PreparationStatus, string> = {
  DRAFT: "Draft",
  NEEDS_INFORMATION: "Needs information",
  READY_FOR_REVIEW: "Ready for review",
  READY_TO_FILE: "Ready to file",
  PACKET_GENERATED: "Packet generated",
};

export const FILING_LABEL: Record<FilingStatus, string> = {
  NOT_FILED: "Not filed",
  EXTERNAL_FILING_IN_PROGRESS: "Filing elsewhere",
  USER_REPORTED_FILED: "Filed (you recorded it)",
  CONNECTOR_CONFIRMED_FILED: "Filed (connector confirmed)",
  RETURNED: "Returned",
};

export const OUTCOME_LABEL: Record<OutcomeStatus, string> = {
  NONE: "No outcome yet",
  AWAITING_RESPONSE: "Awaiting response",
  ACTION_REQUIRED: "Action required",
  REPLY_RECEIVED: "Reply received",
  DISPOSED: "Disposed",
  CLOSED: "Closed",
};

export function jurisdictionFromNotes(value: "central" | "state" | "unclear" | undefined): Jurisdiction {
  if (value === "central") return "CENTRAL";
  if (value === "state") return "STATE";
  return "UNCLEAR";
}

export function isOfficiallyFiled(status: FilingStatus): boolean {
  return status === "USER_REPORTED_FILED" || status === "CONNECTOR_CONFIRMED_FILED";
}

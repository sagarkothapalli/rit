import type { ApplicantDetails } from "@/lib/applicant";
import type { Draft, Notes } from "@/lib/cage/schemas";
import type { ApplicationReport } from "@/lib/report";
import type { AttachmentRecord } from "./attachments";
import type { CaseEvent } from "./events";
import type {
  CaseType,
  FilingStatus,
  Jurisdiction,
  OutcomeStatus,
  PreparationStatus,
  VerificationSource,
} from "./status";

export type { CaseType, FilingStatus, Jurisdiction, OutcomeStatus, PreparationStatus, VerificationSource };

export type OfficialReferenceKind =
  | "ORIGINAL_REQUEST"
  | "TRANSFER"
  | "PART_TRANSFER"
  | "FIRST_APPEAL"
  | "SECOND_APPEAL"
  | "COMPLAINT";

export interface OfficialReference {
  id: string;
  caseId: string;
  registrationNumber: string;
  referenceKind: OfficialReferenceKind;
  source: VerificationSource;
  filedAt: string | null;
  receivedAt: string | null;
  parentOfficialReferenceId: string | null;
  isPrimary: boolean;
  createdAt: string;
  authorityName?: string | null;
}

export type DeadlineKind =
  | "REQUEST_RESPONSE"
  | "LIFE_LIBERTY_RESPONSE"
  | "THIRD_PARTY_RESPONSE"
  | "TRANSFER"
  | "FIRST_APPEAL_LIMITATION"
  | "FAA_DECISION"
  | "SECOND_APPEAL_LIMITATION"
  | "ADDITIONAL_FEE";

export type DeadlineStatus = "OPEN" | "DUE_SOON" | "OVERDUE" | "SATISFIED" | "NOT_STARTED";

export interface DeadlineRecord {
  id: string;
  caseId: string;
  officialReferenceId: string | null;
  kind: DeadlineKind;
  startsAt: string;
  dueAt: string;
  ruleVersion: string;
  status: DeadlineStatus;
  satisfiedByEventId: string | null;
  createdAt: string;
  explanation: string;
  source: VerificationSource;
}

export interface CaseApplicant extends ApplicantDetails {
  ownerEmail: string;
}

export type FirstAppealGround =
  | "REFUSED_ACCESS"
  | "NO_RESPONSE"
  | "UNREASONABLE_FEE"
  | "INCOMPLETE_MISLEADING_FALSE"
  | "OTHER";

export type ComplaintGround =
  | "UNABLE_TO_SUBMIT"
  | "REFUSED_ACCESS"
  | "NO_RESPONSE"
  | "UNREASONABLE_FEE"
  | "INCOMPLETE_MISLEADING_FALSE"
  | "OTHER_SECTION_18";

export interface RequestDraftPayload {
  kind: "RTI_REQUEST";
  transcript: string;
  notes: Notes | null;
  draft: Draft | null;
  report: ApplicationReport | null;
  portalText: string;
  coveringStatement: string | null;
  usesSupportingTextPdf: boolean;
  lifeOrLiberty: boolean;
  thirdParty: boolean;
  authorityCode: string | null;
}

export interface FirstAppealDraftPayload {
  kind: "FIRST_APPEAL";
  ground: FirstAppealGround | null;
  background: string;
  informationNotSupplied: string;
  groundsAndRelief: string;
  delayExplanation: string;
  noResponse: boolean;
  replyDate: string | null;
  originalFiledAt: string | null;
  originalRegistrationNumber: string;
  originalFilingChannel: "online" | "physical" | "";
  targetOfficialReferenceId: string | null;
}

export interface SecondAppealDraftPayload {
  kind: "SECOND_APPEAL";
  background: string;
  informationSought: string;
  informationNotProvided: string;
  reasonsForDissatisfaction: string;
  grounds: string;
  prayer: string;
  compensationGrounds: string;
  relatedCommissionOrder: string;
  delayExplanation: string;
  faaOrderDate: string | null;
  faaOrderReceivedAt: string | null;
  noFaaDecision: boolean;
  destination: "CIC" | "SIC" | "";
  furnishedCopyToAuthority: boolean;
}

export interface ComplaintDraftPayload {
  kind: "SECTION_18_COMPLAINT";
  ground: ComplaintGround | null;
  relatedRtiExists: boolean;
  unableToSubmitReason: string;
  lifeOrLibertyExplanation: string;
  publicAuthorityJustification: string;
  facts: string;
  relief: string;
  furnishedCopyToAuthority: boolean;
}

export type CaseDraftPayload =
  | RequestDraftPayload
  | FirstAppealDraftPayload
  | SecondAppealDraftPayload
  | ComplaintDraftPayload;

export interface CaseDraft {
  id: string;
  caseId: string;
  version: number;
  payload: CaseDraftPayload;
  portalText: string;
  characterCount: number;
  createdAt: string;
  confirmedAt: string | null;
}

export interface PacketMeta {
  generatedAt: string;
  documentIds: string[];
  zipAttachmentId: string | null;
  ruleVersion: string;
}

export interface CaseRecord {
  id: string;
  ownerEmail: string;
  prajaReference: string;
  accessTokenHash: string;
  caseType: CaseType;
  parentCaseId: string | null;
  targetOfficialReferenceId: string | null;
  jurisdiction: Jurisdiction;
  authorityCode: string | null;
  authorityName: string;
  authorityLevel: string | null;
  filingChannel: string | null;
  preparationStatus: PreparationStatus;
  filingStatus: FilingStatus;
  outcomeStatus: OutcomeStatus;
  title: string;
  language: string;
  draftVersion: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  applicant: CaseApplicant;
  draft: CaseDraft;
  officialReferences: OfficialReference[];
  events: CaseEvent[];
  attachments: AttachmentRecord[];
  deadlines: DeadlineRecord[];
  packet: PacketMeta | null;
  remindersEnabled: boolean;
  legacyAcknowledgementNumber: string | null;
  ruleDestination: string;
}

export interface CaseSummary {
  id: string;
  prajaReference: string;
  caseType: CaseType;
  title: string;
  authorityName: string;
  preparationStatus: PreparationStatus;
  filingStatus: FilingStatus;
  outcomeStatus: OutcomeStatus;
  createdAt: string;
  updatedAt: string;
  nearestDeadline: string | null;
  pendingAction: string | null;
  parentCaseId: string | null;
}

export function toSummary(record: CaseRecord): CaseSummary {
  const open = record.deadlines
    .filter((item) => item.status === "OPEN" || item.status === "DUE_SOON" || item.status === "OVERDUE")
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
  return {
    id: record.id,
    prajaReference: record.prajaReference,
    caseType: record.caseType,
    title: record.title,
    authorityName: record.authorityName,
    preparationStatus: record.preparationStatus,
    filingStatus: record.filingStatus,
    outcomeStatus: record.outcomeStatus,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    nearestDeadline: open?.dueAt ?? null,
    pendingAction: nextActionLabel(record),
    parentCaseId: record.parentCaseId,
  };
}

export function nextActionLabel(record: CaseRecord): string | null {
  if (record.preparationStatus === "DRAFT" || record.preparationStatus === "NEEDS_INFORMATION") return "Continue drafting";
  if (record.preparationStatus === "READY_FOR_REVIEW") return "Review the filing packet";
  if (record.filingStatus === "NOT_FILED" && record.preparationStatus === "PACKET_GENERATED") return "File on the official channel";
  if (record.filingStatus === "EXTERNAL_FILING_IN_PROGRESS") return "Record the official reference";
  if (record.outcomeStatus === "ACTION_REQUIRED") return "Action required";
  const overdue = record.deadlines.find((item) => item.status === "OVERDUE");
  if (overdue && record.caseType === "RTI_REQUEST") return "First appeal may be available";
  if (overdue && record.caseType === "FIRST_APPEAL") return "Second appeal may be available";
  if (record.filingStatus === "USER_REPORTED_FILED" && record.outcomeStatus === "AWAITING_RESPONSE") {
    return "Awaiting official response";
  }
  return null;
}

export const FIRST_APPEAL_GROUND_LABEL: Record<FirstAppealGround, string> = {
  REFUSED_ACCESS: "Refused access to the requested information",
  NO_RESPONSE: "No response within the applicable time",
  UNREASONABLE_FEE: "Unreasonable fee",
  INCOMPLETE_MISLEADING_FALSE: "Incomplete, misleading, or false information",
  OTHER: "Other ground",
};

export const COMPLAINT_GROUND_LABEL: Record<ComplaintGround, string> = {
  UNABLE_TO_SUBMIT: "Unable to submit a request because no PIO was appointed or forwarding was refused",
  REFUSED_ACCESS: "Refused access to information",
  NO_RESPONSE: "No response within the applicable time",
  UNREASONABLE_FEE: "Unreasonable fee",
  INCOMPLETE_MISLEADING_FALSE: "Incomplete, misleading, or false information",
  OTHER_SECTION_18: "Another matter relating to requesting or obtaining records under Section 18",
};

import { emptyApplicant } from "@/lib/applicant";
import type {
  CaseDraftPayload,
  CaseRecord,
  ComplaintDraftPayload,
  FirstAppealDraftPayload,
  SecondAppealDraftPayload,
} from "@/lib/domain/case";
import type { CaseType, Jurisdiction } from "@/lib/domain/status";
import { filingRulesFor } from "@/lib/filing-rules/registry";
import { hashAccessToken, makeAccessToken, makePrajaReference, newId } from "./id";
import { emptyMockPayment } from "@/lib/payment/mock";

export function hydratePayload(payload: CaseDraftPayload): CaseDraftPayload {
  if (payload.kind === "FIRST_APPEAL") return { ...emptyFirstAppealDraft(), ...payload };
  if (payload.kind === "SECOND_APPEAL") return { ...emptySecondAppealDraft(), ...payload };
  if (payload.kind === "SECTION_18_COMPLAINT") return { ...emptyComplaintDraft(), ...payload };
  return payload;
}

export function hydrateCase(record: CaseRecord): CaseRecord {
  return {
    ...record,
    reminderPreferences: record.reminderPreferences ?? { inApp: true, email: false, sms: false },
    photoEvidence: record.photoEvidence ?? [],
    mockPayment: record.mockPayment ?? emptyMockPayment(),
    draft: { ...record.draft, payload: hydratePayload(record.draft.payload) },
  };
}

export function emptyFirstAppealDraft(): FirstAppealDraftPayload {
  return {
    kind: "FIRST_APPEAL",
    ground: null,
    background: "",
    informationNotSupplied: "",
    groundsAndRelief: "",
    delayExplanation: "",
    noResponse: false,
    replyDate: null,
    originalFiledAt: null,
    originalRegistrationNumber: "",
    originalFilingChannel: "",
    targetOfficialReferenceId: null,
    originalRequestSummary: "",
    chronology: "",
    pioName: "",
    pioDesignation: "",
    faaName: "",
    faaDesignation: "",
  };
}

export function emptySecondAppealDraft(): SecondAppealDraftPayload {
  return {
    kind: "SECOND_APPEAL",
    background: "",
    informationSought: "",
    informationNotProvided: "",
    reasonsForDissatisfaction: "",
    grounds: "",
    prayer: "",
    compensationGrounds: "",
    relatedCommissionOrder: "",
    delayExplanation: "",
    faaOrderDate: null,
    faaOrderReceivedAt: null,
    noFaaDecision: false,
    destination: "",
    furnishedCopyToAuthority: false,
    originalRegistrationNumber: "",
    firstAppealRegistrationNumber: "",
    firstAppealFiledAt: null,
    chronology: "",
    pioName: "",
    pioDesignation: "",
    faaName: "",
    faaDesignation: "",
  };
}

export function emptyComplaintDraft(): ComplaintDraftPayload {
  return {
    kind: "SECTION_18_COMPLAINT",
    ground: null,
    relatedRtiExists: true,
    unableToSubmitReason: "",
    lifeOrLibertyExplanation: "",
    publicAuthorityJustification: "",
    facts: "",
    relief: "",
    furnishedCopyToAuthority: false,
    relatedRegistrationNumber: "",
    chronology: "",
    pioName: "",
    publicAuthorityAddress: "",
    destination: "",
  };
}

export function payloadFor(caseType: CaseType): CaseDraftPayload {
  if (caseType === "FIRST_APPEAL") return emptyFirstAppealDraft();
  if (caseType === "SECOND_APPEAL") return emptySecondAppealDraft();
  if (caseType === "SECTION_18_COMPLAINT") return emptyComplaintDraft();
  return {
    kind: "RTI_REQUEST",
    transcript: "",
    notes: null,
    draft: null,
    report: null,
    portalText: "",
    coveringStatement: null,
    usesSupportingTextPdf: false,
    lifeOrLiberty: false,
    thirdParty: false,
    authorityCode: null,
  };
}

export async function createBlankCase(input: {
  caseType: CaseType;
  ownerEmail: string;
  parentCaseId?: string | null;
  jurisdiction?: Jurisdiction;
  authorityName?: string;
  language?: string;
  title?: string;
}): Promise<CaseRecord> {
  const now = new Date().toISOString();
  const id = newId();
  const prajaReference = makePrajaReference(input.caseType);
  const accessToken = makeAccessToken();
  const jurisdiction = input.jurisdiction ?? "UNCLEAR";
  const rules = filingRulesFor({ caseType: input.caseType, jurisdiction });
  const payload = payloadFor(input.caseType);
  const applicant = { ...emptyApplicant(), email: input.ownerEmail, ownerEmail: input.ownerEmail };
  return {
    id,
    ownerEmail: input.ownerEmail.trim().toLowerCase(),
    prajaReference,
    accessToken,
    accessTokenHash: await hashAccessToken(accessToken),
    caseType: input.caseType,
    parentCaseId: input.parentCaseId ?? null,
    targetOfficialReferenceId: null,
    jurisdiction,
    authorityCode: null,
    authorityName: input.authorityName ?? "Not selected",
    authorityLevel: jurisdiction === "STATE" ? "state" : jurisdiction === "CENTRAL" ? "central" : null,
    filingChannel: rules.filingChannel,
    preparationStatus: "DRAFT",
    filingStatus: "NOT_FILED",
    outcomeStatus: "NONE",
    title: input.title ?? "Untitled case",
    language: input.language ?? "en-IN",
    draftVersion: 1,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    applicant,
    draft: {
      id: newId(),
      caseId: id,
      version: 1,
      payload,
      portalText: "",
      characterCount: 0,
      createdAt: now,
      confirmedAt: null,
    },
    officialReferences: [],
    events: [
      {
        id: newId(),
        caseId: id,
        officialReferenceId: null,
        eventType: "CASE_CREATED",
        source: "PRAJA",
        occurredAt: now,
        recordedAt: now,
        payload: { caseType: input.caseType },
        createdBy: input.ownerEmail,
        idempotencyKey: `create:${id}`,
      },
    ],
    attachments: [],
    deadlines: [],
    packet: null,
    remindersEnabled: true,
    reminderPreferences: { inApp: true, email: false, sms: false },
    photoEvidence: [],
    mockPayment: emptyMockPayment(),
    legacyAcknowledgementNumber: input.caseType === "RTI_REQUEST" ? prajaReference : null,
    ruleDestination: rules.destination,
  };
}

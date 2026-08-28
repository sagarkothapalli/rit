import type { CaseRecord, ComplaintDraftPayload, FirstAppealDraftPayload, SecondAppealDraftPayload } from "@/lib/domain/case";
import { validateApplicant } from "@/lib/applicant";
import { missingRequiredDocuments } from "@/lib/packets/required";
import { filingRulesFor } from "@/lib/filing-rules/registry";
import { firstAppealWindow, secondAppealWindow } from "@/lib/deadlines/calculate";

export function firstAppealErrors(
  draft: FirstAppealDraftPayload,
  parent: CaseRecord | null,
  opts?: { late?: boolean; requireApplicant?: boolean; record?: CaseRecord },
): string[] {
  const errors: string[] = [];
  if (!draft.ground) errors.push("Select the ground for appeal.");
  if (!draft.originalRegistrationNumber.trim() || !draft.originalFiledAt) {
    errors.push("Enter the original official registration number and filing date.");
  }
  if (!draft.noResponse && !draft.replyDate) {
    errors.push("Enter the CPIO or SPIO reply date, or mark that no response was received.");
  }
  if (!draft.background.trim() || !draft.groundsAndRelief.trim()) {
    errors.push("Write the background and the grounds with the relief sought.");
  }
  if (opts?.late && !draft.delayExplanation.trim()) {
    errors.push("The limitation period has passed. A delay explanation is required.");
  }
  if (parent && parent.officialReferences.length > 1 && !draft.targetOfficialReferenceId) {
    errors.push("Choose the exact official branch you are appealing.");
  }
  if (opts?.requireApplicant && opts.record) {
    const problems = validateApplicant(opts.record.applicant);
    if (problems.length) errors.push("Complete the appellant particulars before preparing the packet.");
  }
  return errors;
}

export function secondAppealErrors(
  draft: SecondAppealDraftPayload,
  opts?: { late?: boolean; requireApplicant?: boolean; record?: CaseRecord },
): string[] {
  const errors: string[] = [];
  if (!draft.grounds.trim() || !draft.prayer.trim()) {
    errors.push("Write the grounds and the specific prayer.");
  }
  if (!draft.noFaaDecision && !draft.faaOrderDate) {
    errors.push("Enter the FAA order date, or mark that the First Appellate Authority has not decided.");
  }
  if (!draft.originalRegistrationNumber.trim() || !draft.firstAppealRegistrationNumber.trim()) {
    errors.push("Enter the original RTI registration number and the first-appeal registration number.");
  }
  if (!draft.destination) {
    errors.push("Confirm whether this goes to the CIC or the applicable SIC.");
  }
  if (opts?.late && !draft.delayExplanation.trim()) {
    errors.push("The limitation period has passed. A delay explanation is required.");
  }
  if (opts?.requireApplicant && opts.record) {
    const problems = validateApplicant(opts.record.applicant);
    if (problems.length) errors.push("Complete the appellant particulars before preparing the packet.");
  }
  return errors;
}

export function complaintErrors(
  draft: ComplaintDraftPayload,
  jurisdiction: CaseRecord["jurisdiction"],
  opts?: { requireApplicant?: boolean; record?: CaseRecord },
): string[] {
  const errors: string[] = [];
  if (!draft.ground) errors.push("Select the specific Section 18 ground.");
  if (draft.ground === "UNABLE_TO_SUBMIT" && !draft.unableToSubmitReason.trim()) {
    errors.push("Explain why the request could not be submitted.");
  }
  if (!draft.facts.trim() || !draft.relief.trim()) {
    errors.push("Write the facts and the relief sought.");
  }
  if (jurisdiction === "UNCLEAR") {
    errors.push("Classify the matter as Central or State before addressing a Commission.");
  }
  if (draft.relatedRtiExists && !draft.relatedRegistrationNumber.trim() && draft.ground !== "UNABLE_TO_SUBMIT") {
    errors.push("Enter the related RTI registration number, or mark that no request could be submitted.");
  }
  if (opts?.requireApplicant && opts.record) {
    const problems = validateApplicant(opts.record.applicant);
    if (problems.length) errors.push("Complete the complainant particulars before preparing the packet.");
  }
  return errors;
}

export function packetBlockingReasons(record: CaseRecord): string[] {
  const rules = filingRulesFor({ caseType: record.caseType, jurisdiction: record.jurisdiction });
  return missingRequiredDocuments(record, rules).map(
    (kind) => `Attach the required ${kind.replaceAll("_", " ").toLowerCase()} before generating the packet.`,
  );
}

export function firstAppealIsLate(draft: FirstAppealDraftPayload, parent: CaseRecord | null): boolean {
  if (!draft.originalFiledAt) return false;
  const rules = filingRulesFor({
    caseType: "FIRST_APPEAL",
    jurisdiction: parent?.jurisdiction ?? "UNCLEAR",
  });
  const window = firstAppealWindow({
    filedAt: draft.originalFiledAt,
    replyReceivedAt: draft.noResponse ? null : draft.replyDate,
    rule: rules,
    lifeOrLiberty: parent?.draft.payload.kind === "RTI_REQUEST" ? parent.draft.payload.lifeOrLiberty : false,
    thirdParty: parent?.draft.payload.kind === "RTI_REQUEST" ? parent.draft.payload.thirdParty : false,
  });
  return !window.eligible;
}

export function secondAppealIsLate(draft: SecondAppealDraftPayload, faaFiledAt: string): boolean {
  if (!faaFiledAt) return false;
  const rules = filingRulesFor({
    caseType: "SECOND_APPEAL",
    jurisdiction: draft.destination === "SIC" ? "STATE" : draft.destination === "CIC" ? "CENTRAL" : "UNCLEAR",
  });
  const window = secondAppealWindow({
    faaFiledAt,
    faaDecisionAt: draft.noFaaDecision ? null : draft.faaOrderDate,
    faaDecisionReceivedAt: draft.faaOrderReceivedAt,
    rule: rules,
  });
  return !window.eligible;
}

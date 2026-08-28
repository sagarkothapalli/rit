import type { ApplicantDetails } from "@/lib/applicant";
import { normalizeFilingFilename } from "@/lib/domain/attachments";
import { disallowedInText, type FilingRuleSet } from "./schema";

export interface AttachmentCandidate {
  name: string;
  mimeType: string;
  byteSize: number;
  kind?: string;
}

export interface RuleProblem {
  code: string;
  message: string;
  blocking: boolean;
}

export function coveringStatement(title: string): string {
  const subject = title.trim() || "the information sought";
  return (
    `The complete request for ${subject} is enclosed as a supporting PDF, because it exceeds the portal text limit. `
    + "Please treat that attachment as the request under Section 6(1) of the RTI Act, 2005."
  );
}

export function preparePortalText(fullText: string, rules: FilingRuleSet) {
  const disallowed = disallowedInText(fullText);
  const overLimit = fullText.length > rules.text.maxCharacters;
  const needsAttachment = overLimit || disallowed.length > 0;
  return {
    portalText: needsAttachment ? coveringStatement("the records requested") : fullText,
    needsAttachment,
    overLimit,
    disallowed,
  };
}

export function validatePortalText(text: string, rules: FilingRuleSet, usingAttachment: boolean): RuleProblem[] {
  const problems: RuleProblem[] = [];
  const disallowed = disallowedInText(text);
  if (disallowed.length > 0 && !usingAttachment) {
    problems.push({
      code: "DISALLOWED_CHARACTERS",
      message: `The portal rejects these characters: ${disallowed.join(" ")}. Remove them, or put the full request in a supporting PDF.`,
      blocking: true,
    });
  }
  if (text.length > rules.text.maxCharacters && !usingAttachment) {
    problems.push({
      code: "OVER_LIMIT",
      message: `This text is ${text.length.toLocaleString("en-IN")} characters. The destination accepts ${rules.text.maxCharacters.toLocaleString("en-IN")}.`,
      blocking: true,
    });
  }
  return problems;
}

export function validateApplicantAgainstRules(applicant: ApplicantDetails, rules: FilingRuleSet): RuleProblem[] {
  const problems: RuleProblem[] = [];
  if (rules.applicant.mobileRequired && !/^[0-9]{10}$/.test(applicant.mobile.replace(/\D/g, ""))) {
    problems.push({ code: "MOBILE_REQUIRED", message: "This destination requires a 10-digit mobile number for SMS alerts.", blocking: true });
  }
  if (rules.applicant.emailRequired && !/^\S+@\S+\.\S+$/.test(applicant.email.trim())) {
    problems.push({ code: "EMAIL_REQUIRED", message: "Enter a valid email address.", blocking: true });
  }
  if (applicant.isBpl && rules.documents.bplProofRequiredIfClaimed) {
    if (!applicant.bplDocument) {
      problems.push({ code: "BPL_PROOF_REQUIRED", message: "Upload a copy of the BPL certificate or card to claim the fee exemption.", blocking: true });
    } else if (applicant.bplDocument.status === "flagged") {
      problems.push({ code: "BPL_INVALID", message: applicant.bplDocument.flagReason || "The uploaded document cannot be used as BPL proof.", blocking: true });
    }
  }
  return problems;
}

export function validateAttachment(file: AttachmentCandidate, rules: FilingRuleSet): RuleProblem[] {
  const problems: RuleProblem[] = [];
  const mime = file.mimeType.toLowerCase();
  const byExt = /\.pdf$/i.test(file.name) && rules.attachments.mimeTypes.includes("application/pdf");
  if (rules.attachments.pdfOnly && mime !== "application/pdf" && !byExt) {
    problems.push({ code: "MIME", message: "This destination accepts PDF files only.", blocking: true });
  } else if (!rules.attachments.mimeTypes.includes(mime) && !byExt) {
    problems.push({ code: "MIME", message: `This destination accepts: ${rules.attachments.mimeTypes.join(", ")}.`, blocking: true });
  }
  if (file.byteSize <= 0) problems.push({ code: "EMPTY", message: "The file is empty.", blocking: true });
  if (file.byteSize > rules.attachments.maxBytes) {
    const mb = rules.attachments.maxBytes / 1_000_000;
    problems.push({ code: "TOO_LARGE", message: `This destination accepts files up to ${mb % 1 === 0 ? mb.toFixed(0) : mb.toFixed(1)} MB.`, blocking: true });
  }
  if (rules.attachments.filenameNoSpaces && /\s/.test(file.name)) {
    problems.push({ code: "FILENAME_SPACES", message: `The portal rejects spaces in filenames. It will be stored as ${normalizeFilingFilename(file.name)}.`, blocking: false });
  }
  return problems;
}

export function sniffPdf(bytes: Uint8Array): boolean {
  return bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

export function isEncryptedPdf(bytes: Uint8Array): boolean {
  return /\/Encrypt[\s\/]/.test(new TextDecoder("latin1").decode(bytes.slice(0, Math.min(bytes.length, 2048))));
}

import type { AttachmentKind } from "@/lib/domain/attachments";
import type { CaseRecord } from "@/lib/domain/case";
import type { FilingRuleSet } from "@/lib/filing-rules/schema";

export const USER_PACKET_KINDS: AttachmentKind[] = [
  "BPL_PROOF",
  "SUPPORTING",
  "CPIO_REPLY",
  "FAA_ORDER",
  "SERVICE_COPY",
  "OFFICIAL_RECEIPT",
  "FULL_REQUEST_PDF",
  "PORTAL_COVERING",
  "PHOTO",
];

export function liveAttachments(record: CaseRecord) {
  return record.attachments.filter((item) => !item.deletedAt);
}

export function missingRequiredDocuments(record: CaseRecord, rules: FilingRuleSet): AttachmentKind[] {
  const live = liveAttachments(record);
  const payload = record.draft.payload;
  const missing: AttachmentKind[] = [];
  for (const kind of rules.documents.requiredKinds as AttachmentKind[]) {
    if (kind === "CPIO_REPLY" && payload.kind === "FIRST_APPEAL" && payload.noResponse) continue;
    if (kind === "FAA_ORDER" && payload.kind === "SECOND_APPEAL" && payload.noFaaDecision) continue;
    if (kind === "APPLICATION_PDF" && payload.kind === "SECTION_18_COMPLAINT" && !payload.relatedRtiExists) continue;
    if (!live.some((item) => item.kind === kind)) missing.push(kind);
  }
  if (record.applicant.isBpl && rules.documents.bplProofRequiredIfClaimed) {
    if (!live.some((item) => item.kind === "BPL_PROOF")) missing.push("BPL_PROOF");
  }
  return missing;
}

import { createApplicationPdf } from "@/lib/application-pdf";
import type { AttachmentRecord } from "@/lib/domain/attachments";
import { normalizeFilingFilename } from "@/lib/domain/attachments";
import type { CaseRecord } from "@/lib/domain/case";
import { filingRulesFor } from "@/lib/filing-rules/registry";
import { newId } from "@/lib/storage/id";
import { createComplaintPdf } from "./complaint";
import { createFirstAppealPdf } from "./first-appeal";
import { createIndexPdf } from "./shared";
import { createFullRequestPdf, receiptFromCase } from "./request";
import { createSecondAppealPdf } from "./second-appeal";
import { blobToBytes, zipStore } from "./zip";

export { createFirstAppealPdf } from "./first-appeal";
export { createSecondAppealPdf } from "./second-appeal";
export { createComplaintPdf } from "./complaint";
export { createFullRequestPdf, receiptFromCase } from "./request";
export { createIndexPdf } from "./shared";
export { zipStore } from "./zip";

export interface PacketFile {
  name: string;
  kind: AttachmentRecord["kind"];
  blob: Blob;
}

export function primaryPacketPdf(record: CaseRecord): Blob {
  if (record.caseType === "FIRST_APPEAL") return createFirstAppealPdf(record);
  if (record.caseType === "SECOND_APPEAL") return createSecondAppealPdf(record);
  if (record.caseType === "SECTION_18_COMPLAINT") return createComplaintPdf(record);
  const payload = record.draft.payload.kind === "RTI_REQUEST" ? record.draft.payload : null;
  if (payload?.report) {
    return createApplicationPdf({
      report: payload.report,
      applicant: record.applicant,
      acknowledgementNumber: record.prajaReference,
    });
  }
  return createFullRequestPdf(record);
}

export async function assemblePacketFiles(record: CaseRecord, extra: PacketFile[] = []): Promise<PacketFile[]> {
  const rules = filingRulesFor({
    caseType: record.caseType,
    jurisdiction: record.jurisdiction,
  });
  const files: PacketFile[] = [
    { name: "01-application.pdf", kind: primaryKind(record), blob: primaryPacketPdf(record) },
    { name: "00-document-index.pdf", kind: "INDEX", blob: createIndexPdf(record, rules) },
    { name: "99-praja-acknowledgement.pdf", kind: "RECEIPT_PDF", blob: receiptFromCase(record) },
    ...extra,
  ];
  if (record.caseType === "RTI_REQUEST" && record.draft.payload.kind === "RTI_REQUEST" && record.draft.payload.usesSupportingTextPdf) {
    files.push({ name: "02-full-request.pdf", kind: "FULL_REQUEST_PDF", blob: createFullRequestPdf(record) });
  }
  return files;
}

function primaryKind(record: CaseRecord): AttachmentRecord["kind"] {
  if (record.caseType === "FIRST_APPEAL") return "FIRST_APPEAL";
  if (record.caseType === "SECOND_APPEAL") return "SECOND_APPEAL";
  if (record.caseType === "SECTION_18_COMPLAINT") return "COMPLAINT";
  return "APPLICATION_PDF";
}

export async function packetZip(files: PacketFile[]): Promise<Blob> {
  const entries = await Promise.all(
    files.map(async (file) => ({
      name: normalizeFilingFilename(file.name),
      bytes: await blobToBytes(file.blob),
    })),
  );
  return zipStore(entries);
}

export function attachmentMeta(
  record: CaseRecord,
  file: PacketFile,
  byteSize: number,
): AttachmentRecord {
  const id = newId();
  const stored = normalizeFilingFilename(file.name);
  return {
    id,
    caseId: record.id,
    eventId: null,
    kind: file.kind,
    originalName: file.name,
    storedName: stored,
    mimeType: file.blob.type || "application/pdf",
    byteSize,
    sha256: "",
    storageKey: id,
    pageCount: null,
    language: record.language,
    verificationStatus: "VALID",
    createdAt: new Date().toISOString(),
    deletedAt: null,
  };
}

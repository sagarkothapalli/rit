import { createApplicationPdf } from "@/lib/application-pdf";
import type { AttachmentKind, AttachmentRecord } from "@/lib/domain/attachments";
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
import { missingRequiredDocuments, USER_PACKET_KINDS } from "./required";

export { createFirstAppealPdf } from "./first-appeal";
export { createSecondAppealPdf } from "./second-appeal";
export { createComplaintPdf } from "./complaint";
export { createFullRequestPdf, receiptFromCase } from "./request";
export { createIndexPdf } from "./shared";
export { zipStore } from "./zip";
export { missingRequiredDocuments } from "./required";

export interface PacketFile {
  name: string;
  kind: AttachmentRecord["kind"];
  blob: Blob;
}

export type BytesResolver = (attachment: AttachmentRecord) => Promise<Uint8Array | null>;

export interface AssembleResult {
  files: PacketFile[];
  missingRequired: string[];
  omitted: string[];
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

function primaryKind(record: CaseRecord): AttachmentRecord["kind"] {
  if (record.caseType === "FIRST_APPEAL") return "FIRST_APPEAL";
  if (record.caseType === "SECOND_APPEAL") return "SECOND_APPEAL";
  if (record.caseType === "SECTION_18_COMPLAINT") return "COMPLAINT";
  return "APPLICATION_PDF";
}

function bytesToBlob(bytes: Uint8Array, mimeType: string): Blob {
  return new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], {
    type: mimeType,
  });
}

export async function assemblePacketFiles(
  record: CaseRecord,
  extra: PacketFile[] = [],
  resolveBytes?: BytesResolver,
): Promise<AssembleResult> {
  const rules = filingRulesFor({
    caseType: record.caseType,
    jurisdiction: record.jurisdiction,
  });
  const omitted: string[] = [];
  const content: PacketFile[] = [
    { name: "01-application.pdf", kind: primaryKind(record), blob: primaryPacketPdf(record) },
  ];

  const generatingFullRequest =
    record.caseType === "RTI_REQUEST" &&
    record.draft.payload.kind === "RTI_REQUEST" &&
    record.draft.payload.usesSupportingTextPdf;
  if (generatingFullRequest) {
    content.push({ name: "02-full-request.pdf", kind: "FULL_REQUEST_PDF", blob: createFullRequestPdf(record) });
  }

  let userIndex = 10;
  for (const attachment of record.attachments.filter((item) => !item.deletedAt)) {
    if (!USER_PACKET_KINDS.includes(attachment.kind)) continue;
    if (generatingFullRequest && attachment.kind === "FULL_REQUEST_PDF") continue;
    if (!resolveBytes) {
      omitted.push(attachment.originalName);
      continue;
    }
    const bytes = await resolveBytes(attachment);
    if (!bytes) {
      omitted.push(attachment.originalName);
      continue;
    }
    content.push({
      name: `${String(userIndex).padStart(2, "0")}-${normalizeFilingFilename(attachment.storedName)}`,
      kind: attachment.kind,
      blob: bytesToBlob(bytes, attachment.mimeType || "application/pdf"),
    });
    userIndex += 1;
  }

  content.push(...extra);
  content.push({ name: "99-praja-acknowledgement.pdf", kind: "RECEIPT_PDF", blob: receiptFromCase(record) });

  const listed = await Promise.all(
    content.map(async (file) => ({
      name: file.name,
      kind: file.kind,
      byteSize: (await blobToBytes(file.blob)).byteLength,
    })),
  );
  const files: PacketFile[] = [
    { name: "00-document-index.pdf", kind: "INDEX", blob: createIndexPdf(record, rules, listed) },
    ...content,
  ];
  return {
    files,
    missingRequired: missingRequiredDocuments(record, rules),
    omitted,
  };
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

export function packedKinds(files: PacketFile[]): AttachmentKind[] {
  return files.map((file) => file.kind);
}

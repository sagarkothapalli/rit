import type { AttachmentKind, AttachmentRecord } from "@/lib/domain/attachments";
import { normalizeFilingFilename } from "@/lib/domain/attachments";
import type { CaseRecord } from "@/lib/domain/case";
import { newId } from "@/lib/storage/id";

export interface PacketFile {
  name: string;
  kind: AttachmentKind;
  blob: Blob;
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

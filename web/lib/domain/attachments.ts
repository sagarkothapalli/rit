export type AttachmentKind =
  | "APPLICATION_PDF"
  | "RECEIPT_PDF"
  | "PORTAL_COVERING"
  | "FULL_REQUEST_PDF"
  | "BPL_PROOF"
  | "SUPPORTING"
  | "CPIO_REPLY"
  | "FAA_ORDER"
  | "FIRST_APPEAL"
  | "SECOND_APPEAL"
  | "COMPLAINT"
  | "INDEX"
  | "SERVICE_COPY"
  | "OFFICIAL_RECEIPT"
  | "PACKET_ZIP";

export type AttachmentVerification = "UNVERIFIED_REVIEW_REQUIRED" | "VALID" | "INVALID" | "UNCLEAR";

export const ATTACHMENT_KIND_LABEL: Record<AttachmentKind, string> = {
  APPLICATION_PDF: "Application",
  RECEIPT_PDF: "Praja acknowledgement",
  PORTAL_COVERING: "Portal covering statement",
  FULL_REQUEST_PDF: "Full request (attachment)",
  BPL_PROOF: "BPL proof",
  SUPPORTING: "Supporting document",
  CPIO_REPLY: "CPIO / SPIO reply",
  FAA_ORDER: "FAA order",
  FIRST_APPEAL: "First appeal",
  SECOND_APPEAL: "Second appeal",
  COMPLAINT: "Section 18 complaint",
  INDEX: "Document index",
  SERVICE_COPY: "Service copy",
  OFFICIAL_RECEIPT: "Official receipt",
  PACKET_ZIP: "Filing packet",
};

export interface AttachmentRecord {
  id: string;
  caseId: string;
  eventId: string | null;
  kind: AttachmentKind;
  originalName: string;
  storedName: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
  storageKey: string;
  pageCount: number | null;
  language: string | null;
  verificationStatus: AttachmentVerification;
  createdAt: string;
  deletedAt: string | null;
}

export function normalizeFilingFilename(original: string): string {
  const trimmed = original.trim() || "document.pdf";
  const lastDot = trimmed.lastIndexOf(".");
  const base = lastDot > 0 ? trimmed.slice(0, lastDot) : trimmed;
  const ext = lastDot > 0 ? trimmed.slice(lastDot + 1) : "pdf";
  const safeBase = base.replace(/\s+/g, "_").replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80) || "document";
  const safeExt = ext.replace(/[^A-Za-z0-9]/g, "").slice(0, 8) || "pdf";
  return `${safeBase}.${safeExt}`;
}

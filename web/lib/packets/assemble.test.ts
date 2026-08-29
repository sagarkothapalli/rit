import { describe, expect, it } from "vitest";
import { assemblePacketFiles, createFullRequestPdf } from "./index";
import { createBlankCase } from "@/lib/storage/factory";
import type { AttachmentRecord } from "@/lib/domain/attachments";

function attachment(partial: Partial<AttachmentRecord>): AttachmentRecord {
  return {
    id: "88888888-8888-4888-8888-888888888888",
    caseId: "case",
    eventId: null,
    kind: "BPL_PROOF",
    originalName: "bpl-card.pdf",
    storedName: "bpl-card.pdf",
    mimeType: "application/pdf",
    byteSize: 12,
    sha256: "abc",
    storageKey: "key",
    pageCount: null,
    language: null,
    verificationStatus: "VALID",
    createdAt: "2026-01-01T00:00:00.000Z",
    deletedAt: null,
    ...partial,
  };
}

describe("packet assembly", () => {
  it("includes uploaded citizen documents when bytes can be resolved", async () => {
    const record = await createBlankCase({ caseType: "RTI_REQUEST", ownerEmail: "a@b.com" });
    record.attachments = [attachment({})];
    const assembled = await assemblePacketFiles(record, [], async () => new Uint8Array([1, 2, 3, 4]));
    expect(assembled.files.some((file) => file.kind === "BPL_PROOF")).toBe(true);
    expect(assembled.omitted).toEqual([]);
  });

  it("does not claim an omitted document in the packed file list", async () => {
    const record = await createBlankCase({ caseType: "RTI_REQUEST", ownerEmail: "a@b.com" });
    record.attachments = [attachment({ originalName: "missing-reply.pdf", kind: "CPIO_REPLY" })];
    const assembled = await assemblePacketFiles(record);
    expect(assembled.files.some((file) => file.kind === "CPIO_REPLY")).toBe(false);
    expect(assembled.omitted).toContain("missing-reply.pdf");
  });
});

// jspdf was bumped across a major for GHSA advisories; this is the check that
// the packet PDFs still render on it.
describe("pdf rendering", () => {
  it("produces a real PDF blob", async () => {
    const record = await createBlankCase({ caseType: "RTI_REQUEST", ownerEmail: "a@b.com" });
    const blob = createFullRequestPdf(record);
    expect(blob.size).toBeGreaterThan(500);
    const head = new TextDecoder().decode((await blob.arrayBuffer()).slice(0, 5));
    expect(head).toBe("%PDF-");
  });
});

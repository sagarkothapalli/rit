import { describe, expect, it } from "vitest";
import { coveringStatement, preparePortalText } from "./portal-text";
import { CENTRAL_REQUEST_RULES } from "./registry";
import { validateAttachment, validatePortalText } from "./validate";

describe("filing rules", () => {
  it("blocks disallowed characters unless the attachment path is used", () => {
    const text = "Please provide copies of the file — including “notings”.";
    const blocked = validatePortalText(text, CENTRAL_REQUEST_RULES, false);
    const allowed = validatePortalText(text, CENTRAL_REQUEST_RULES, true);
    expect(blocked.some((item) => item.code === "DISALLOWED_CHARACTERS" && item.blocking)).toBe(true);
    expect(allowed.some((item) => item.blocking)).toBe(false);
  });

  it("turns an over-limit request into a covering statement plus attachment", () => {
    const long = "A".repeat(3001);
    const prepared = preparePortalText(long, CENTRAL_REQUEST_RULES);
    expect(prepared.needsAttachment).toBe(true);
    expect(prepared.portalText).toBe(coveringStatement("the records requested"));
    expect(prepared.portalText.length).toBeLessThan(CENTRAL_REQUEST_RULES.text.maxCharacters);
  });

  it("sniffs encrypted and non-PDF bytes", async () => {
    const { sniffPdf, isEncryptedPdf, validateAttachmentBytes } = await import("./validate");
    expect(sniffPdf(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe(true);
    expect(sniffPdf(new Uint8Array([0x00, 0x01]))).toBe(false);
    expect(isEncryptedPdf(new TextEncoder().encode("%PDF-1.4\n/Encrypt /Standard"))).toBe(true);
    const problems = validateAttachmentBytes(
      { name: "dup.pdf", mimeType: "application/pdf", byteSize: 20, bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]) },
      CENTRAL_REQUEST_RULES,
      ["deadbeef"],
      "deadbeef",
    );
    expect(problems.some((item) => item.code === "DUPLICATE_DOCUMENT" && item.blocking)).toBe(true);
  });

  it("rejects an oversized supporting PDF for the Central portal", () => {
    const problems = validateAttachment(
      { name: "support.pdf", mimeType: "application/pdf", byteSize: 1_500_000 },
      CENTRAL_REQUEST_RULES,
    );
    expect(problems.some((item) => item.code === "TOO_LARGE" && item.blocking)).toBe(true);
  });
});

import { NextResponse } from "next/server";
import { z } from "zod";
import { isEncryptedPdf, sniffPdf, validateAttachment } from "@/lib/filing-rules/validate";
import { filingRulesFor } from "@/lib/filing-rules/registry";
import { normalizeFilingFilename, type AttachmentKind } from "@/lib/domain/attachments";
import { saveCaseRecord } from "@/lib/storage/cases.server";
import { putAttachmentBytes, storageKeyFor } from "@/lib/storage/attachments.server";
import { newId, sha256Hex } from "@/lib/storage/id";
import { guardWrite, ownerCase, readJson } from "@/lib/storage/api-helpers";

export const dynamic = "force-dynamic";

const Body = z.object({
  originalName: z.string().min(1).max(200),
  mimeType: z.string().max(100),
  kind: z.string().max(40),
  base64: z.string().min(8).max(16_000_000),
  clientId: z.string().uuid().optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = guardWrite(req, "attach-complete");
  if (blocked) return blocked;
  const { id } = await ctx.params;
  const loaded = await ownerCase(req, id);
  if (loaded instanceof NextResponse) return loaded;
  const body = await readJson(req);
  if (body instanceof NextResponse) return body;
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  const bytes = Buffer.from(parsed.data.base64.replace(/^data:[^;]+;base64,/, ""), "base64");
  const rules = filingRulesFor({ caseType: loaded.record.caseType, jurisdiction: loaded.record.jurisdiction });
  const problems = validateAttachment(
    { name: parsed.data.originalName, mimeType: parsed.data.mimeType, byteSize: bytes.length },
    rules,
  );
  if (problems.some((item) => item.blocking)) {
    return NextResponse.json({ error: "INVALID_ATTACHMENT", problems }, { status: 400 });
  }
  if (rules.attachments.pdfOnly) {
    if (!sniffPdf(bytes)) return NextResponse.json({ error: "NOT_PDF" }, { status: 400 });
    if (isEncryptedPdf(bytes)) return NextResponse.json({ error: "ENCRYPTED_PDF" }, { status: 400 });
  }
  const sha = await sha256Hex(bytes);
  const duplicate = loaded.record.attachments.find((item) => item.sha256 === sha && !item.deletedAt);
  if (duplicate) {
    return NextResponse.json({ case: loaded.record, attachment: duplicate, duplicate: true });
  }
  const liveCount = loaded.record.attachments.filter((item) => !item.deletedAt).length;
  if (liveCount >= rules.attachments.maxCount) {
    return NextResponse.json({ error: "TOO_MANY_DOCUMENTS" }, { status: 400 });
  }
  const attachmentId = parsed.data.clientId ?? newId();
  const storageKey = storageKeyFor(sha, attachmentId);
  await putAttachmentBytes(storageKey, bytes, parsed.data.mimeType);
  const now = new Date().toISOString();
  const attachment = {
    id: attachmentId,
    caseId: id,
    eventId: null,
    kind: parsed.data.kind as AttachmentKind,
    originalName: parsed.data.originalName,
    storedName: normalizeFilingFilename(parsed.data.originalName),
    mimeType: parsed.data.mimeType,
    byteSize: bytes.length,
    sha256: sha,
    storageKey,
    pageCount: null,
    language: null,
    verificationStatus: "UNVERIFIED_REVIEW_REQUIRED" as const,
    createdAt: now,
    deletedAt: null,
  };
  const record = {
    ...loaded.record,
    attachments: [...loaded.record.attachments, attachment],
    updatedAt: now,
  };
  await saveCaseRecord(record, loaded.email, loaded.record.updatedAt);
  return NextResponse.json({ case: record, attachment });
}

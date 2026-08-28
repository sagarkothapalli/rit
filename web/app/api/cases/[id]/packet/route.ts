import { NextResponse } from "next/server";
import { assemblePacketFiles, attachmentMeta, packetZip } from "@/lib/packets";
import { saveCaseRecord } from "@/lib/storage/cases.server";
import { getAttachmentBytes, putAttachmentBytes } from "@/lib/storage/attachments.server";
import { newId } from "@/lib/storage/id";
import { guardWrite, ownerCase } from "@/lib/storage/api-helpers";
import { blobToBytes } from "@/lib/packets/zip";
import { stripClientSecrets } from "@/lib/storage/case-guard";
import { filingRulesFor } from "@/lib/filing-rules/registry";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = guardWrite(req, "case-packet");
  if (blocked) return blocked;
  const { id } = await ctx.params;
  const loaded = await ownerCase(req, id);
  if (loaded instanceof NextResponse) return loaded;
  const assembled = await assemblePacketFiles(loaded.record, [], async (attachment) => {
    const stored = await getAttachmentBytes(attachment.storageKey);
    return stored ? new Uint8Array(stored.bytes) : null;
  });
  if (assembled.missingRequired.length) {
    return NextResponse.json({ error: "MISSING_DOCUMENTS", missing: assembled.missingRequired }, { status: 400 });
  }
  const zip = await packetZip(assembled.files);
  const now = new Date().toISOString();
  const attachments = [...loaded.record.attachments];
  const documentIds: string[] = [];
  for (const file of assembled.files) {
    const bytes = Buffer.from(await blobToBytes(file.blob));
    const meta = attachmentMeta(loaded.record, file, bytes.length);
    await putAttachmentBytes(meta.storageKey, bytes, meta.mimeType);
    attachments.push(meta);
    documentIds.push(meta.id);
  }
  const zipBytes = Buffer.from(await blobToBytes(zip));
  const zipMeta = attachmentMeta(
    loaded.record,
    { name: "filing-packet.zip", kind: "PACKET_ZIP", blob: zip },
    zipBytes.length,
  );
  await putAttachmentBytes(zipMeta.storageKey, zipBytes, "application/zip");
  attachments.push(zipMeta);
  const rules = filingRulesFor({ caseType: loaded.record.caseType, jurisdiction: loaded.record.jurisdiction });
  const record = {
    ...loaded.record,
    attachments,
    preparationStatus: "PACKET_GENERATED" as const,
    packet: {
      generatedAt: now,
      documentIds,
      zipAttachmentId: zipMeta.id,
      ruleVersion: rules.id,
    },
    updatedAt: now,
    events: [
      ...loaded.record.events,
      {
        id: newId(),
        caseId: id,
        officialReferenceId: null,
        eventType: "PACKET_GENERATED" as const,
        source: "PRAJA" as const,
        occurredAt: now,
        recordedAt: now,
        payload: { files: assembled.files.length, omitted: assembled.omitted },
        createdBy: loaded.email,
        idempotencyKey: `packet:${id}:${now}`,
      },
    ],
  };
  await saveCaseRecord(record, loaded.email, loaded.record.updatedAt);
  return NextResponse.json({ case: stripClientSecrets(record), omitted: assembled.omitted });
}

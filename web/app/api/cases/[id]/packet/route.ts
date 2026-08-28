import { NextResponse } from "next/server";
import { assemblePacketFiles, attachmentMeta, packetZip } from "@/lib/packets";
import { saveCaseRecord } from "@/lib/storage/cases.server";
import { putAttachmentBytes } from "@/lib/storage/attachments.server";
import { newId } from "@/lib/storage/id";
import { guardWrite, ownerCase } from "@/lib/storage/api-helpers";
import { blobToBytes } from "@/lib/packets/zip";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = guardWrite(req, "case-packet");
  if (blocked) return blocked;
  const { id } = await ctx.params;
  const loaded = await ownerCase(req, id);
  if (loaded instanceof NextResponse) return loaded;
  const files = await assemblePacketFiles(loaded.record);
  const zip = await packetZip(files);
  const now = new Date().toISOString();
  const attachments = [...loaded.record.attachments];
  for (const file of files) {
    const bytes = Buffer.from(await blobToBytes(file.blob));
    const meta = attachmentMeta(loaded.record, file, bytes.length);
    await putAttachmentBytes(meta.storageKey, bytes, meta.mimeType);
    attachments.push(meta);
  }
  const zipBytes = Buffer.from(await blobToBytes(zip));
  const zipMeta = attachmentMeta(
    loaded.record,
    { name: "filing-packet.zip", kind: "PACKET_ZIP", blob: zip },
    zipBytes.length,
  );
  await putAttachmentBytes(zipMeta.storageKey, zipBytes, "application/zip");
  attachments.push(zipMeta);
  const record = {
    ...loaded.record,
    attachments,
    preparationStatus: "PACKET_GENERATED" as const,
    packet: {
      generatedAt: now,
      documentIds: attachments.map((item) => item.id),
      zipAttachmentId: zipMeta.id,
      ruleVersion: loaded.record.ruleDestination,
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
        payload: { files: files.length },
        createdBy: loaded.email,
        idempotencyKey: `packet:${id}:${now}`,
      },
    ],
  };
  await saveCaseRecord(record);
  return NextResponse.json({ case: record });
}

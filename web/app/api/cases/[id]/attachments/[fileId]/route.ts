import { NextResponse } from "next/server";
import { saveCaseRecord } from "@/lib/storage/cases.server";
import { getAttachmentBytes } from "@/lib/storage/attachments.server";
import { guardWrite, ownerCase } from "@/lib/storage/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string; fileId: string }> }) {
  const { id, fileId } = await ctx.params;
  const loaded = await ownerCase(req, id);
  if (loaded instanceof NextResponse) return loaded;
  const attachment = loaded.record.attachments.find((item) => item.id === fileId && !item.deletedAt);
  if (!attachment) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const stored = await getAttachmentBytes(attachment.storageKey);
  if (!stored) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return new NextResponse(new Uint8Array(stored.bytes), {
    headers: {
      "Content-Type": stored.mimeType,
      "Content-Disposition": `attachment; filename="${attachment.storedName}"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string; fileId: string }> }) {
  const blocked = guardWrite(req, "attach-delete");
  if (blocked) return blocked;
  const { id, fileId } = await ctx.params;
  const loaded = await ownerCase(req, id);
  if (loaded instanceof NextResponse) return loaded;
  const now = new Date().toISOString();
  const record = {
    ...loaded.record,
    attachments: loaded.record.attachments.map((item) => (item.id === fileId ? { ...item, deletedAt: now } : item)),
    updatedAt: now,
  };
  await saveCaseRecord(record);
  return NextResponse.json({ case: record });
}

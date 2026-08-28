import { NextResponse } from "next/server";
import { assemblePacketFiles, packetZip } from "@/lib/packets";
import { getAttachmentBytes } from "@/lib/storage/attachments.server";
import { ownerCase } from "@/lib/storage/api-helpers";
import { limited } from "@/lib/storage/api-helpers";
import { blobToBytes } from "@/lib/packets/zip";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = limited(req, "packet-download", 20);
  if (blocked) return blocked;
  const { id } = await ctx.params;
  const loaded = await ownerCase(req, id);
  if (loaded instanceof NextResponse) return loaded;
  const zipId = loaded.record.packet?.zipAttachmentId;
  if (zipId) {
    const stored = loaded.record.attachments.find((item) => item.id === zipId);
    if (stored) {
      const bytes = await getAttachmentBytes(stored.storageKey);
      if (bytes) {
        return new NextResponse(new Uint8Array(bytes.bytes), {
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="${loaded.record.prajaReference.replaceAll("/", "-")}-packet.zip"`,
          },
        });
      }
    }
  }
  const assembled = await assemblePacketFiles(loaded.record, [], async (attachment) => {
    const stored = await getAttachmentBytes(attachment.storageKey);
    return stored ? new Uint8Array(stored.bytes) : null;
  });
  const zip = await packetZip(assembled.files);
  const bytes = await blobToBytes(zip);
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${loaded.record.prajaReference.replaceAll("/", "-")}-packet.zip"`,
    },
  });
}

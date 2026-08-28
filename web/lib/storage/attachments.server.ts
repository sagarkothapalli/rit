import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), ".data", "attachments");

export interface StoredBytes {
  bytes: Buffer;
  mimeType: string;
}

function keyPath(storageKey: string): string {
  const safe = storageKey.replace(/[^a-f0-9]/gi, "").slice(0, 64) || "unknown";
  return path.join(ROOT, `${safe}.bin`);
}

export async function putAttachmentBytes(storageKey: string, bytes: Buffer, mimeType: string): Promise<void> {
  await fs.mkdir(ROOT, { recursive: true });
  const target = keyPath(storageKey);
  const tmp = `${target}.tmp`;
  await fs.writeFile(tmp, bytes, { mode: 0o600 });
  await fs.writeFile(`${target}.meta.json`, JSON.stringify({ mimeType, byteSize: bytes.length }), { mode: 0o600 });
  await fs.rename(tmp, target);
}

export async function getAttachmentBytes(storageKey: string): Promise<StoredBytes | null> {
  try {
    const bytes = await fs.readFile(keyPath(storageKey));
    let mimeType = "application/octet-stream";
    try {
      const meta = JSON.parse(await fs.readFile(`${keyPath(storageKey)}.meta.json`, "utf8")) as { mimeType?: string };
      mimeType = meta.mimeType || mimeType;
    } catch {
      // meta optional
    }
    return { bytes, mimeType };
  } catch {
    return null;
  }
}

export function storageKeyFor(sha256: string, id: string): string {
  return createHash("sha256").update(`${sha256}:${id}`).digest("hex");
}

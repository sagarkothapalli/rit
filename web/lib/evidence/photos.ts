export interface PhotoEvidenceItem {
  id: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  scene: string;
  visibleText: string[];
  confirmed: boolean;
  mode: "LIVE" | "DETERMINISTIC_DEMO";
  createdAt: string;
}

const ALLOWED = new Set(["image/jpeg", "image/png", "image/jpg"]);
export const MAX_PHOTO_BYTES = 5_000_000;
export const MAX_PHOTOS = 3;

export function photoAllowed(file: { name: string; type: string; size: number }): string | null {
  const mime = file.type.toLowerCase();
  const byExt = /\.(jpe?g|png)$/i.test(file.name);
  if (!ALLOWED.has(mime) && !byExt) return "Attach a JPEG or PNG photograph.";
  if (file.size <= 0) return "The photograph is empty.";
  if (file.size > MAX_PHOTO_BYTES) return "Each photograph must be 5 MB or smaller.";
  return null;
}

export function photoEvidenceFallback(fileName: string, byteSize: number, mimeType: string): PhotoEvidenceItem {
  return {
    id: crypto.randomUUID(),
    fileName,
    mimeType,
    byteSize,
    scene:
      "Demo evidence analysis: a photograph was attached. Visible contents were not interpreted because no vision key is configured. Confirm any facts before they enter the draft.",
    visibleText: [],
    confirmed: false,
    mode: "DETERMINISTIC_DEMO",
    createdAt: new Date().toISOString(),
  };
}

export function confirmedPhotoFacts(items: PhotoEvidenceItem[]): string {
  const confirmed = items.filter((item) => item.confirmed);
  if (confirmed.length === 0) return "";
  return confirmed
    .map((item, index) => `Photograph ${index + 1} (${item.fileName}): ${item.scene}`)
    .join("\n");
}

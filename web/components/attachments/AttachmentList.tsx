"use client";

import type { AttachmentRecord } from "@/lib/domain/attachments";
import { ATTACHMENT_KIND_LABEL } from "@/lib/domain/attachments";
import { downloadBlob } from "@/lib/application-records";
import { downloadAttachmentBytes } from "@/lib/storage/cases.client";

export default function AttachmentList({
  items,
  caseId,
  onRemove,
}: {
  items: AttachmentRecord[];
  caseId?: string;
  onRemove?: (id: string) => void;
}) {
  const live = items.filter((item) => !item.deletedAt);
  if (live.length === 0) return <p className="step-hint">No documents attached yet.</p>;

  async function download(item: AttachmentRecord) {
    const blob = await downloadAttachmentBytes(caseId ?? item.caseId, item.id);
    if (!blob) return;
    downloadBlob(item.storedName, new Blob([blob.bytes], { type: item.mimeType }));
  }

  return (
    <ul className="attachment-list">
      {live.map((item) => (
        <li key={item.id}>
          <div>
            <strong>{item.originalName}</strong>
            <small>
              {ATTACHMENT_KIND_LABEL[item.kind]} · {Math.ceil(item.byteSize / 1024)} KB · {item.verificationStatus.replaceAll("_", " ").toLowerCase()}
            </small>
          </div>
          <div className="attachment-list-actions">
            <button type="button" className="link-button" onClick={() => void download(item)}>
              Download
            </button>
            {onRemove && (
              <button type="button" className="link-button is-danger" onClick={() => onRemove(item.id)}>
                Remove
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

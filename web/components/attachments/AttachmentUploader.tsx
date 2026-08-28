"use client";

import { useRef, useState } from "react";
import type { AttachmentKind, AttachmentRecord } from "@/lib/domain/attachments";
import { normalizeFilingFilename } from "@/lib/domain/attachments";
import type { FilingRuleSet } from "@/lib/filing-rules/schema";
import { validateAttachment, type RuleProblem } from "@/lib/filing-rules/validate";
import { newId, sha256Hex } from "@/lib/storage/id";
import { putAttachmentBlob } from "@/lib/storage/cases.client";
import AttachmentValidation from "./AttachmentValidation";

export default function AttachmentUploader({
  caseId,
  kind,
  rules,
  label,
  onAdded,
}: {
  caseId: string;
  kind: AttachmentKind;
  rules: FilingRuleSet;
  label: string;
  onAdded: (record: AttachmentRecord) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [problems, setProblems] = useState<RuleProblem[]>([]);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    const found = validateAttachment(
      { name: file.name, mimeType: file.type || "application/octet-stream", byteSize: file.size, kind },
      rules,
    );
    setProblems(found);
    if (found.some((item) => item.blocking)) return;
    setBusy(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const id = newId();
      const sha = await sha256Hex(bytes);
      const storedName = normalizeFilingFilename(file.name);
      await putAttachmentBlob({ id, caseId, mimeType: file.type || "application/pdf", bytes: bytes.buffer });
      onAdded({
        id,
        caseId,
        eventId: null,
        kind,
        originalName: file.name,
        storedName,
        mimeType: file.type || "application/pdf",
        byteSize: file.size,
        sha256: sha,
        storageKey: id,
        pageCount: null,
        language: null,
        verificationStatus: "UNVERIFIED_REVIEW_REQUIRED",
        createdAt: new Date().toISOString(),
        deletedAt: null,
      });
    } finally {
      setBusy(false);
    }
  }

  const accept = rules.attachments.pdfOnly ? "application/pdf,.pdf" : "application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png";
  const mb = rules.attachments.maxBytes / 1_000_000;

  return (
    <div className="attachment-uploader">
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={accept}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <button type="button" className="secondary-button" onClick={() => inputRef.current?.click()} disabled={busy}>
        {busy ? "Adding…" : label}
      </button>
      <p className="applicant-hint">
        {rules.attachments.pdfOnly ? "PDF only" : "PDF or image"} · up to {mb % 1 === 0 ? mb.toFixed(0) : mb.toFixed(1)} MB
        · rule verified {rules.verifiedAt}
      </p>
      <AttachmentValidation problems={problems} />
    </div>
  );
}

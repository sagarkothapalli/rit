"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import WorkspaceShell from "@/components/cases/WorkspaceShell";
import ExternalFilingHandoff from "@/components/cases/ExternalFilingHandoff";
import DocumentIndexReview from "@/components/attachments/DocumentIndexReview";
import AttachmentList from "@/components/attachments/AttachmentList";
import type { CaseRecord } from "@/lib/domain/case";
import { filingRulesFor } from "@/lib/filing-rules/registry";
import { assemblePacketFiles, packetZip, primaryPacketPdf } from "@/lib/packets";
import { downloadBlob } from "@/lib/application-records";
import { fetchCase, putAttachmentBlob, saveCase } from "@/lib/storage/cases.client";
import { attachmentMeta } from "@/lib/packets";
import { blobToBytes } from "@/lib/packets/zip";

export default function FilingPage() {
  const params = useParams<{ caseId: string }>();
  const [record, setRecord] = useState<CaseRecord | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetchCase(params.caseId).then(setRecord);
  }, [params.caseId]);

  if (!record) {
    return (
      <WorkspaceShell>
        <article className="workspace-panel">
          <div className="step-body">
            <h1>Case not found.</h1>
            <Link className="primary-button" href="/cases">My RTI cases</Link>
          </div>
        </article>
      </WorkspaceShell>
    );
  }

  const rules = filingRulesFor({ caseType: record.caseType, jurisdiction: record.jurisdiction });

  async function generate() {
    if (!record) return;
    setBusy(true);
    try {
      const files = await assemblePacketFiles(record);
      const zip = await packetZip(files);
      const zipBytes = await blobToBytes(zip);
      const zipMeta = attachmentMeta(record, { name: "filing-packet.zip", kind: "PACKET_ZIP", blob: zip }, zipBytes.byteLength);
      await putAttachmentBlob({
        id: zipMeta.id,
        caseId: record.id,
        mimeType: "application/zip",
        bytes: zipBytes.buffer as ArrayBuffer,
      });
      const next: CaseRecord = {
        ...record,
        preparationStatus: "PACKET_GENERATED",
        attachments: [...record.attachments.filter((item) => item.kind !== "PACKET_ZIP"), zipMeta],
        packet: {
          generatedAt: new Date().toISOString(),
          documentIds: record.attachments.map((item) => item.id).concat(zipMeta.id),
          zipAttachmentId: zipMeta.id,
          ruleVersion: rules.id,
        },
        updatedAt: new Date().toISOString(),
      };
      await saveCase(next);
      setRecord(next);
      downloadBlob(`${record.prajaReference.replaceAll("/", "-")}-packet.zip`, zip);
    } finally {
      setBusy(false);
    }
  }

  function downloadPdf() {
    if (!record) return;
    downloadBlob("filing-packet.pdf", primaryPacketPdf(record));
  }

  return (
    <WorkspaceShell>
      <article className="workspace-panel">
        <div className="step-body">
          <h1>Filing packet.</h1>
          <p className="step-lede">
            Review the documents, then file them on the official channel. Generating a packet is not a government filing.
          </p>
          <DocumentIndexReview items={record.attachments} rules={rules} />
          <AttachmentList items={record.attachments} />
          <div className="step-actions">
            <button type="button" className="primary-button" onClick={() => void generate()} disabled={busy}>
              {busy ? "Preparing…" : "Generate packet"}
            </button>
            <button type="button" className="secondary-button" onClick={downloadPdf}>
              Download application PDF
            </button>
          </div>
          <ExternalFilingHandoff
            rules={rules}
            bpl={record.applicant.isBpl}
            caseId={record.id}
            stateMatter={record.jurisdiction === "STATE"}
          />
        </div>
      </article>
    </WorkspaceShell>
  );
}

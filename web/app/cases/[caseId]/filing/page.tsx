"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCaseId } from "@/hooks/useCaseId";
import WorkspaceShell from "@/components/cases/WorkspaceShell";
import ExternalFilingHandoff from "@/components/cases/ExternalFilingHandoff";
import DocumentIndexReview from "@/components/attachments/DocumentIndexReview";
import AttachmentList from "@/components/attachments/AttachmentList";
import AttachmentUploader from "@/components/attachments/AttachmentUploader";
import type { CaseRecord } from "@/lib/domain/case";
import { filingRulesFor } from "@/lib/filing-rules/registry";
import { assemblePacketFiles, packetZip, primaryPacketPdf } from "@/lib/packets";
import { missingRequiredDocuments } from "@/lib/packets/required";
import { downloadBlob } from "@/lib/application-records";
import { downloadAttachmentBytes, fetchCase, jsonOk, putAttachmentBlob, saveCase } from "@/lib/storage/cases.client";
import { attachmentMeta } from "@/lib/packets";
import { blobToBytes } from "@/lib/packets/zip";
import { casePath } from "@/lib/storage/paths";
import { recordMockPayment } from "@/lib/payment/mock";

export default function FilingPage() {
  const caseId = useCaseId();
  const [record, setRecord] = useState<CaseRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchCase(caseId).then(setRecord);
  }, [caseId]);

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
  const missing = missingRequiredDocuments(record, rules);

  async function generate() {
    if (!record) return;
    if (missing.length) {
      setError(`Attach required documents first: ${missing.join(", ").replaceAll("_", " ").toLowerCase()}.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${encodeURIComponent(record.id)}/packet`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (res.ok && jsonOk(res)) {
        const payload = (await res.json()) as { case?: CaseRecord };
        if (payload.case) setRecord(payload.case);
      }
      const assembled = await assemblePacketFiles(record, [], async (attachment) => {
        const blob = await downloadAttachmentBytes(record.id, attachment.id);
        return blob ? new Uint8Array(blob.bytes) : null;
      });
      if (assembled.missingRequired.length) {
        setError(`Attach required documents first: ${assembled.missingRequired.join(", ").replaceAll("_", " ").toLowerCase()}.`);
        return;
      }
      const zip = await packetZip(assembled.files);
      const zipBytes = await blobToBytes(zip);
      const zipMeta = attachmentMeta(record, { name: "filing-packet.zip", kind: "PACKET_ZIP", blob: zip }, zipBytes.byteLength);
      await putAttachmentBlob({
        id: zipMeta.id,
        caseId: record.id,
        mimeType: "application/zip",
        bytes: zipBytes.buffer as ArrayBuffer,
      });
      const packedIds = record.attachments
        .filter((item) => assembled.files.some((file) => file.kind === item.kind && !item.deletedAt))
        .map((item) => item.id);
      const next: CaseRecord = {
        ...record,
        preparationStatus: "PACKET_GENERATED",
        attachments: [...record.attachments.filter((item) => item.kind !== "PACKET_ZIP"), zipMeta],
        packet: {
          generatedAt: new Date().toISOString(),
          documentIds: [...new Set([...packedIds, zipMeta.id])],
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

  async function demoPay() {
    if (!record) return;
    const payment = recordMockPayment({ bpl: record.applicant.isBpl, amountRupees: rules.fee.amountRupees });
    const next = { ...record, mockPayment: payment, updatedAt: new Date().toISOString() };
    await saveCase(next);
    setRecord(next);
  }

  return (
    <WorkspaceShell>
      <article className="workspace-panel">
        <div className="step-body">
          <h1>Filing packet.</h1>
          <p className="step-lede">
            Review the documents, then file them on the official channel. Generating a packet is not a government filing.
          </p>
          {missing.length > 0 && (
            <p className="step-error">Required before generate: {missing.join(", ").replaceAll("_", " ").toLowerCase()}.</p>
          )}
          <AttachmentUploader
            caseId={record.id}
            kind="SUPPORTING"
            rules={rules}
            label="Add a supporting document"
            existing={record.attachments}
            record={record}
            onAdded={(attachment) => setRecord({ ...record, attachments: [...record.attachments, attachment] })}
          />
          <DocumentIndexReview items={record.attachments} rules={rules} />
          <AttachmentList items={record.attachments} caseId={record.id} />
          {error && <p className="step-error" role="alert">{error}</p>}
          <div className="step-actions">
            <button type="button" className="primary-button" onClick={() => void generate()} disabled={busy || missing.length > 0}>
              {busy ? "Preparing…" : "Generate packet"}
            </button>
            <button type="button" className="secondary-button" onClick={downloadPdf}>
              Download application PDF
            </button>
          </div>
          <section className="handoff-card" aria-labelledby="demo-pay-title">
            <h2 id="demo-pay-title">Demo payment</h2>
            <p>
              Simulated ₹{rules.fee.amountRupees} receipt for this workspace. It is not a government payment and does not
              file the request.
            </p>
            {record.mockPayment.status === "NONE" ? (
              <button type="button" className="secondary-button" onClick={() => void demoPay()}>
                {record.applicant.isBpl ? "Record BPL fee exemption (demo)" : `Record demo ₹${rules.fee.amountRupees} payment`}
              </button>
            ) : (
              <p className="step-hint">
                {record.mockPayment.status === "DEMO_EXEMPT" ? "Demo BPL exemption" : "Demo payment"} · {record.mockPayment.receiptId}
              </p>
            )}
          </section>
          <ExternalFilingHandoff
            rules={rules}
            bpl={record.applicant.isBpl}
            caseId={record.id}
            stateMatter={record.jurisdiction === "STATE"}
          />
          <Link className="ghost-button" href={casePath(record.id)}>Back to the case</Link>
        </div>
      </article>
    </WorkspaceShell>
  );
}

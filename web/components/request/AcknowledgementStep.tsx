"use client";

import { downloadPdfBase64, type StoredApplication } from "@/lib/application-records";

/* ============================================================
   Step 9. The acknowledgement.

   The number is Praja's own, and the wording never lets that
   blur into a government registration number — the difference
   matters if the citizen later chases a reply.
   ============================================================ */

interface AcknowledgementStepProps {
  record: StoredApplication;
  storageMessage: string | null;
  onBack: () => void;
  onStartOver?: () => void;
}

export default function AcknowledgementStep({
  record,
  storageMessage,
  onBack,
}: AcknowledgementStepProps) {
  return (
    <div className="step-body">
      <h1>Your copy is saved.</h1>
      <p className="step-lede">
        Keep this number. It reopens the application and both PDFs from the home page, on any device.
      </p>

      <div className="ack-card">
        <span className="ack-label">Praja Acknowledgement Number</span>
        <strong className="ack-number">{record.acknowledgementNumber}</strong>
        {storageMessage && <span className="ack-storage">{storageMessage}</span>}
        <button
          type="button"
          className="link-button"
          onClick={() => void navigator.clipboard.writeText(record.acknowledgementNumber)}
        >
          Copy the number
        </button>
      </div>

      <dl className="ack-facts">
        <div>
          <dt>Authority</dt>
          <dd>{record.report.authority.name}</dd>
        </div>
        <div>
          <dt>Requests</dt>
          <dd>{record.report.requests.length}</dd>
        </div>
        <div>
          <dt>Government status</dt>
          <dd className="ack-not-filed">Not submitted</dd>
        </div>
      </dl>

      <div className="step-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => downloadPdfBase64("praja-rti-application.pdf", record.applicationPdfBase64)}
        >
          Download application PDF
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => downloadPdfBase64("praja-rti-acknowledgement.pdf", record.receiptPdfBase64)}
        >
          Download receipt
        </button>
        <button type="button" className="ghost-button" onClick={onBack}>Back</button>
        <a href="/" className="primary-button">
          Home
        </a>
      </div>
    </div>
  );
}

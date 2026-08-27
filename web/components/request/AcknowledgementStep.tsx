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
  onStartOver: () => void;
}

export default function AcknowledgementStep({
  record,
  storageMessage,
  onBack,
  onStartOver,
}: AcknowledgementStepProps) {
  const stateMatter = record.report.jurisdiction === "state";

  return (
    <div className="step-body">
      <h1>Your copy is saved.</h1>
      <p className="step-lede">
        Keep this number. It reopens the application and both PDFs from the home page, on any device.
      </p>

      <div className="ack-card">
        <span className="ack-label">Praja reference number</span>
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

      <section className="ack-next">
        <h2>What to do next</h2>
        <ol>
          {stateMatter ? (
            <>
              <li>
                Download the application PDF and take it to{" "}
                <strong>{record.report.authority.name}</strong>
                {record.report.filing_channel ? <> via {record.report.filing_channel}</> : null}.
              </li>
              <li>Pay the fee your State prescribes — it is usually Rs 10, and nil if you are below the poverty line.</li>
              <li>Keep the receipt they issue. The 30 day reply clock starts from the date they accept it.</li>
            </>
          ) : (
            <>
              <li>Open rtionline.gov.in and start a new request for this authority.</li>
              <li>Paste the application text from the last page of the PDF into the request field.</li>
              <li>Pay the Rs 10 fee, or upload your BPL certificate instead if it applies.</li>
              <li>Save the registration number the portal issues. That is the number the authority tracks.</li>
            </>
          )}
        </ol>
        <p className="ack-clock">
          The authority must reply within 30 days. If a third party has to be consulted first, that becomes 40
          days. Silence past the deadline is itself a refusal you can appeal.
        </p>
      </section>

      <div className="step-actions">
        <button
          type="button"
          className="primary-button"
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
        {!stateMatter && (
          <a className="ghost-button" href="https://rtionline.gov.in/" rel="noreferrer" target="_blank">
            Go to RTI Online
          </a>
        )}
        <button type="button" className="ghost-button" onClick={onBack}>Back</button>
        <button type="button" className="ghost-button" onClick={onStartOver}>Prepare another</button>
      </div>
    </div>
  );
}

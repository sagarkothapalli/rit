"use client";

import type { ApplicantDetails } from "@/lib/applicant";
import type { ApplicationReport } from "@/lib/report";

/* ============================================================
   Step 8. The PDF the citizen will actually use — rendered
   inline, not described. The summary strip above it repeats only
   the facts that change what happens next: who it goes to, how
   long it is, and what the fee would be.
   ============================================================ */

interface ReviewStepProps {
  report: ApplicationReport;
  applicant: ApplicantDetails;
  pdfUrl: string | null;
  charCount: number;
  saving: boolean;
  ready: boolean;
  error: string | null;
  onDownload: () => void;
  onContinue: () => void;
  onBack: () => void;
}

export default function ReviewStep({
  report,
  applicant,
  pdfUrl,
  charCount,
  saving,
  ready,
  error,
  onDownload,
  onContinue,
  onBack,
}: ReviewStepProps) {
  return (
    <div className="step-body">
      <h1>Your application, as it will look.</h1>
      <p className="step-lede">
        Read it through. Once you confirm, we save a copy and give you an acknowledgement number to reopen it.
      </p>

      <dl className="review-summary">
        <div>
          <dt>Goes to</dt>
          <dd>{report.authority.name}</dd>
        </div>
        <div>
          <dt>File through</dt>
          <dd>{report.filing_channel ?? "Not determined"}</dd>
        </div>
        <div>
          <dt>Length</dt>
          <dd>{charCount.toLocaleString("en-IN")} of 3,000 characters</dd>
        </div>
        <div>
          <dt>Fee</dt>
          <dd>{applicant.isBpl ? "Nil — below poverty line" : "Rs 10, paid on the portal"}</dd>
        </div>
      </dl>

      {pdfUrl ? (
        <object className="review-pdf" data={pdfUrl} type="application/pdf" aria-label="Application PDF preview">
          <p>
            This browser cannot display the PDF. Use the download button below to open it in your PDF reader.
          </p>
        </object>
      ) : (
        <div className="review-pdf-placeholder">Building the PDF…</div>
      )}

      {error && <p className="step-error" role="alert">{error}</p>}

      <div className="step-actions">
        <button type="button" className="primary-button" onClick={onContinue} disabled={!ready || saving}>
          {saving ? "Saving…" : "Confirm and save my copy"}
        </button>
        <button type="button" className="secondary-button" onClick={onDownload} disabled={!ready}>
          Download the PDF
        </button>
        <button type="button" className="ghost-button" onClick={onBack}>Back</button>
      </div>
    </div>
  );
}

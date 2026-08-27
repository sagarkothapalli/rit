"use client";

import type { Guard, Notes } from "@/lib/cage/schemas";

/* ============================================================
   Step 4. Two questions the citizen cannot answer alone:

     1. Does the Act allow this request at all?
     2. Which government actually holds the record?

   Both are decided in code before any model is consulted, so a
   refusal or a jurisdiction warning never depends on a service
   being reachable.
   ============================================================ */

interface EligibilityStepProps {
  guard: Guard;
  notes: Notes | null;
  busy: boolean;
  error: string | null;
  onContinue: () => void;
  onReframe: () => void;
  onBack: () => void;
  onStartOver: () => void;
}

export default function EligibilityStep({
  guard,
  notes,
  busy,
  error,
  onContinue,
  onReframe,
  onBack,
  onStartOver,
}: EligibilityStepProps) {
  const exempt = guard.verdict === "EXEMPT";
  const stateMatter = notes?.jurisdiction === "state";

  if (exempt) {
    return (
      <div className="step-body">
        <h1>The Act does not cover this request.</h1>
        <p className="step-lede">
          We will not draft an application that the authority is entitled to refuse. Here is exactly why, and what
          you can ask for instead.
        </p>

        <div className="verdict-card is-refused">
          <span className="verdict-tag">
            {guard.clause ? `Section ${guard.clause}` : "Not covered by the Act"}
          </span>
          <p>{guard.reason_summary}</p>
        </div>

        {guard.safe_reframing && (
          <div className="verdict-card is-alternative">
            <span className="verdict-tag">A request that would work</span>
            <p>{guard.safe_reframing}</p>
          </div>
        )}

        {error && <p className="step-error" role="alert">{error}</p>}

        <div className="step-actions">
          {guard.safe_reframing && (
            <button type="button" className="primary-button" onClick={onReframe} disabled={busy}>
              {busy ? "Rewriting…" : "Ask it this way instead"}
            </button>
          )}
          <button type="button" className="secondary-button" onClick={onBack}>Change the records</button>
          <button type="button" className="ghost-button" onClick={onStartOver}>Start over</button>
        </div>
      </div>
    );
  }

  return (
    <div className="step-body">
      <h1>This request is allowed.</h1>
      <p className="step-lede">
        Nothing here targets material the Act protects. Two things worth knowing before you file.
      </p>

      <div className="verdict-card is-allowed">
        <span className="verdict-tag">Exemption check passed</span>
        <p>{guard.reason_summary}</p>
      </div>

      {stateMatter ? (
        <div className="verdict-card is-warning">
          <span className="verdict-tag">This is a State or local body matter</span>
          <p>
            The Central RTI Online portal accepts applications for Central government authorities only. It would
            return this one without refunding the fee.
          </p>
          {notes?.jurisdiction_reasons.length ? (
            <ul>
              {notes.jurisdiction_reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
          <p className="verdict-action">
            File it with <strong>{notes?.body_hint ?? "your State authority"}</strong>
            {notes?.filing_channel ? <> through {notes.filing_channel}</> : null}. We will still prepare the
            complete application, addressed correctly.
          </p>
        </div>
      ) : (
        <div className="verdict-card is-neutral">
          <span className="verdict-tag">Central government matter</span>
          <p>
            These records sit with a Central public authority, so this can be filed on the RTI Online portal.
          </p>
        </div>
      )}

      {guard.third_party_notice && (
        <div className="verdict-card is-warning">
          <span className="verdict-tag">Third party involved — Section 11</span>
          <p>
            The records concern someone other than you, such as a contractor or a private firm. The authority must
            invite them to object first, so a reply may take up to 40 days instead of 30. This does not block your
            request.
          </p>
        </div>
      )}

      <details className="eligibility-detail">
        <summary>What the Act does not cover</summary>
        <ul>
          <li>National security, defence, and strategic matters — Section 8(1)(a)</li>
          <li>Cabinet papers while a decision is still incomplete — Section 8(1)(i)</li>
          <li>Trade secrets and a third party&apos;s commercial confidence — Section 8(1)(d)</li>
          <li>An official&apos;s personal life, unconnected to their public duty — Section 8(1)(j)</li>
          <li>Anything that would identify an informant or endanger a person — Section 8(1)(g)</li>
          <li>Information that would impede a live investigation — Section 8(1)(h)</li>
          <li>Intelligence and security organisations in the Second Schedule — Section 24</li>
          <li>Opinions, reasons invented on request, and predictions — the Act gives you records that exist</li>
        </ul>
      </details>

      {error && <p className="step-error" role="alert">{error}</p>}

      <div className="step-actions">
        <button type="button" className="primary-button" onClick={onContinue} disabled={busy}>
          {busy ? "Writing the application…" : "Write my application"}
        </button>
        <button type="button" className="ghost-button" onClick={onBack}>Back</button>
      </div>
    </div>
  );
}

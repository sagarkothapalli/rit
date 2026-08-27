"use client";

import { useState } from "react";
import type { Draft } from "@/lib/cage/schemas";

/* ============================================================
   Step 5. The complete application text.

   Earlier this step showed three request lines and claimed a
   3,000 character budget, which made a 340 character draft look
   like a bug. Now the whole document is on screen — opening
   paragraph included — and the counter measures exactly what the
   portal counts.
   ============================================================ */

interface ApplicationStepProps {
  draft: Draft;
  onEdit: (next: Draft) => void;
  charCount: number;
  overLimit: boolean;
  badCharacters: string[];
  stateMatter: boolean;
  copied: boolean;
  onCopy: () => void;
  onDownload: () => void;
  busy: boolean;
  valid: boolean;
  error: string | null;
  onContinue: () => void;
  onBack: () => void;
}

export default function ApplicationStep({
  draft,
  onEdit,
  charCount,
  overLimit,
  badCharacters,
  stateMatter,
  copied,
  onCopy,
  onDownload,
  busy,
  valid,
  error,
  onContinue,
  onBack,
}: ApplicationStepProps) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="step-body">
      <h1>Your application.</h1>
      <p className="step-lede">
        This is the full text that goes to the authority. Every line is yours to change.
      </p>

      <div className="application-meter">
        <span className={overLimit ? "is-over" : ""}>
          {charCount.toLocaleString("en-IN")} of 3,000 characters
        </span>
        {overLimit && (
          <span className="application-meter-warn">
            Over the portal limit. Trim it, or attach the PDF as a supporting document instead.
          </span>
        )}
        {badCharacters.length > 0 && (
          <span className="application-meter-warn">
            The portal rejects these characters: <code>{badCharacters.join(" ")}</code>
          </span>
        )}
      </div>

      {editing ? (
        <div className="application-edit">
          <label className="describe-field">
            <span className="describe-label">Subject</span>
            <input
              value={draft.title}
              maxLength={160}
              onChange={(event) => onEdit({ ...draft, title: event.target.value })}
            />
          </label>

          <label className="describe-field">
            <span className="describe-label">Opening paragraph</span>
            <textarea
              value={draft.background ?? ""}
              rows={5}
              maxLength={900}
              onChange={(event) => onEdit({ ...draft, background: event.target.value })}
            />
          </label>

          <div className="describe-label">Numbered requests</div>
          {draft.requests.map((request, index) => (
            <div className="records-edit-row" key={index}>
              <span aria-hidden="true">{index + 1}</span>
              <textarea
                value={request}
                rows={3}
                aria-label={`Request ${index + 1}`}
                onChange={(event) =>
                  onEdit({
                    ...draft,
                    requests: draft.requests.map((item, position) =>
                      position === index ? event.target.value : item,
                    ),
                  })
                }
              />
              {draft.requests.length > 3 && (
                <button
                  type="button"
                  className="link-button is-danger"
                  onClick={() =>
                    onEdit({ ...draft, requests: draft.requests.filter((_, position) => position !== index) })
                  }
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          {draft.requests.length < 8 && (
            <button
              type="button"
              className="link-button"
              onClick={() =>
                onEdit({
                  ...draft,
                  requests: [
                    ...draft.requests,
                    "Please provide certified copies of the relevant official record described above.",
                  ],
                })
              }
            >
              Add another request
            </button>
          )}
        </div>
      ) : (
        <div className="application-document">
          <header>
            <span className="application-doc-label">Subject</span>
            <h2>{draft.title}</h2>
          </header>
          {draft.background?.trim() && <p className="application-background">{draft.background}</p>}
          <ol className="application-requests">
            {draft.requests.map((request, index) => (
              <li key={index}>{request}</li>
            ))}
          </ol>
        </div>
      )}

      {!valid && !editing && (
        <p className="step-hint">
          An application needs at least three properly worded requests. Use “Edit the text” to complete them.
        </p>
      )}

      {stateMatter && (
        <p className="step-hint">
          Because this is a State matter, this text goes into your State authority&apos;s own application form
          rather than the Central portal field.
        </p>
      )}

      {error && <p className="step-error" role="alert">{error}</p>}

      <div className="step-actions">
        <button type="button" className="primary-button" onClick={onContinue} disabled={busy || overLimit || !valid}>
          {busy ? "Finding the authority…" : "Find the right authority"}
        </button>
        <button type="button" className="secondary-button" onClick={() => setEditing((open) => !open)}>
          {editing ? "Done editing" : "Edit the text"}
        </button>
        <button type="button" className="ghost-button" onClick={onCopy}>
          {copied ? "Copied" : "Copy text"}
        </button>
        <button type="button" className="ghost-button" onClick={onDownload}>Download</button>
        <button type="button" className="ghost-button" onClick={onBack}>Back</button>
      </div>

      <p className="sr-only" aria-live="polite">{copied ? "Application text copied" : ""}</p>
    </div>
  );
}

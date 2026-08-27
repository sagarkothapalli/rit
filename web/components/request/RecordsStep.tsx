"use client";

import { useState } from "react";
import type { Notes } from "@/lib/cage/schemas";

/* ============================================================
   Step 3. What the application will ask for.

   Read-only by default: this is a summary to confirm, not a form
   to fill. Editing is available behind one control for the
   citizen who spots something wrong, which is the minority case.

   "Format" is never shown as a bare word — it is the question
   the Act actually asks: how do you want to receive the records.
   ============================================================ */

const FORMATS: { value: Notes["format"]; label: string; help: string }[] = [
  {
    value: "certified copies",
    label: "Certified copies",
    help: "Stamped paper copies. The usual choice, and the strongest for later use as evidence.",
  },
  {
    value: "electronic copies",
    label: "Electronic copies",
    help: "Scans or files by email. Faster and cheaper, but not certified.",
  },
  {
    value: "inspection",
    label: "Inspection of records",
    help: "You visit the office and examine the files. Useful when you do not know which document you need.",
  },
  {
    value: "samples",
    label: "Samples of material",
    help: "A physical sample, for example of the material used in a construction work.",
  },
];

interface RecordsStepProps {
  notes: Notes;
  onEdit: (next: Notes) => void;
  busy: boolean;
  error: string | null;
  onContinue: () => void;
  onBack: () => void;
}

export default function RecordsStep({ notes, onEdit, busy, error, onContinue, onBack }: RecordsStepProps) {
  const [editing, setEditing] = useState(false);
  const format = FORMATS.find((option) => option.value === notes.format) ?? FORMATS[0];

  return (
    <div className="step-body">
      <h1>This is what your application will ask for.</h1>
      <p className="step-lede">
        Your words have been turned into requests for records that should already exist on an official file. Read
        them once — this is the substance of the application.
      </p>

      <section className="records-block">
        <h2>Records requested</h2>
        {editing ? (
          <div className="records-edit">
            {notes.records_sought.map((record, index) => (
              <div className="records-edit-row" key={`${index}-${record.slice(0, 12)}`}>
                <span aria-hidden="true">{index + 1}</span>
                <textarea
                  value={record}
                  rows={2}
                  aria-label={`Record ${index + 1}`}
                  onChange={(event) =>
                    onEdit({
                      ...notes,
                      records_sought: notes.records_sought.map((item, position) =>
                        position === index ? event.target.value : item,
                      ),
                    })
                  }
                />
                {notes.records_sought.length > 1 && (
                  <button
                    type="button"
                    className="link-button is-danger"
                    onClick={() =>
                      onEdit({
                        ...notes,
                        records_sought: notes.records_sought.filter((_, position) => position !== index),
                      })
                    }
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            {notes.records_sought.length < 8 && (
              <button
                type="button"
                className="link-button"
                onClick={() => onEdit({ ...notes, records_sought: [...notes.records_sought, ""] })}
              >
                Add another record
              </button>
            )}
          </div>
        ) : (
          <ol className="records-list">
            {notes.records_sought.map((record, index) => (
              <li key={`${index}-${record.slice(0, 12)}`}>{record}</li>
            ))}
          </ol>
        )}
      </section>

      <dl className="records-facts">
        <div>
          <dt>Time period</dt>
          <dd>
            {editing ? (
              <input
                value={notes.date_range ?? ""}
                placeholder="For example, January to June 2026"
                onChange={(event) => onEdit({ ...notes, date_range: event.target.value || null })}
              />
            ) : (
              notes.date_range || <span className="records-unset">Not stated — the whole record will be requested</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Place or project</dt>
          <dd>
            {editing ? (
              <input
                value={notes.place ?? ""}
                placeholder="For example, Ward 12, Gajuwaka"
                onChange={(event) => onEdit({ ...notes, place: event.target.value || null })}
              />
            ) : (
              notes.place || <span className="records-unset">Not stated</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Likely records holder</dt>
          <dd>
            {notes.body_hint || <span className="records-unset">To be matched in step 6</span>}
          </dd>
        </div>
      </dl>

      <section className="format-block">
        <h2>How do you want to receive the records?</h2>
        {editing ? (
          <div className="format-options">
            {FORMATS.map((option) => (
              <label key={option.value} className={notes.format === option.value ? "is-selected" : ""}>
                <input
                  type="radio"
                  name="record-format"
                  value={option.value}
                  checked={notes.format === option.value}
                  onChange={() => onEdit({ ...notes, format: option.value })}
                />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.help}</small>
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="format-summary">
            <strong>{format.label}.</strong> {format.help}
          </p>
        )}
      </section>

      {error && <p className="step-error" role="alert">{error}</p>}

      <div className="step-actions">
        <button type="button" className="primary-button" onClick={onContinue} disabled={busy}>
          {busy ? "Checking eligibility…" : "This is right, continue"}
        </button>
        <button type="button" className="secondary-button" onClick={() => setEditing((open) => !open)}>
          {editing ? "Done editing" : "Change something"}
        </button>
        <button type="button" className="ghost-button" onClick={onBack}>Back</button>
      </div>
    </div>
  );
}

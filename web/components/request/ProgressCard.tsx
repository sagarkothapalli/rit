"use client";

import type { Notes } from "@/lib/cage/schemas";
import { STEPS, type Step } from "./steps";

/* ============================================================
   Side rail. It answers "where am I, and what has been decided
   so far" — nothing else. The gate-mode and model panels that
   used to live here were developer instrumentation and had no
   business on a citizen's screen.
   ============================================================ */

interface ProgressCardProps {
  step: Step;
  notes: Notes | null;
  picked: string | null;
  nameOf: (id: string) => string;
  charCount: number;
}

export default function ProgressCard({ step, notes, picked, nameOf, charCount }: ProgressCardProps) {
  const meta = STEPS.find((item) => item.id === step);
  const position = STEPS.findIndex((item) => item.id === step) + 1;

  return (
    <div className="progress-card">
      <div className="progress-head">
        <span className="progress-step">Step {position} of {STEPS.length}</span>
        <strong>{meta?.label}</strong>
        <p>{meta?.caption}</p>
      </div>

      <dl className="progress-facts">
        {notes?.jurisdiction && notes.jurisdiction !== "unclear" && (
          <div>
            <dt>Jurisdiction</dt>
            <dd>{notes.jurisdiction === "state" ? "State or local body" : "Central government"}</dd>
          </div>
        )}
        {notes?.place && (
          <div>
            <dt>Place</dt>
            <dd>{notes.place}</dd>
          </div>
        )}
        {notes?.date_range && (
          <div>
            <dt>Period</dt>
            <dd>{notes.date_range}</dd>
          </div>
        )}
        {notes?.records_sought.length ? (
          <div>
            <dt>Records</dt>
            <dd>{notes.records_sought.length} requested</dd>
          </div>
        ) : null}
        {picked && (
          <div>
            <dt>Authority</dt>
            <dd>{nameOf(picked)}</dd>
          </div>
        )}
        {charCount > 0 && (
          <div>
            <dt>Length</dt>
            <dd>{charCount.toLocaleString("en-IN")} / 3,000</dd>
          </div>
        )}
      </dl>

      <p className="progress-boundary">
        You confirm every step. Nothing is sent to a government system from here.
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { OfficialReferenceKind } from "@/lib/domain/case";

export interface OfficialFilingValues {
  registrationNumber: string;
  filedAt: string;
  receivedAt: string;
  paymentResult: "paid" | "failed" | "exempt" | "not-recorded";
  receiptNote: string;
  referenceKind: OfficialReferenceKind;
}

export default function OfficialReferenceForm({
  onSubmit,
  busy,
  error,
  defaultKind = "ORIGINAL_REQUEST",
}: {
  onSubmit: (values: OfficialFilingValues) => void;
  busy?: boolean;
  error?: string | null;
  defaultKind?: OfficialReferenceKind;
}) {
  const [values, setValues] = useState<OfficialFilingValues>({
    registrationNumber: "",
    filedAt: "",
    receivedAt: "",
    paymentResult: "not-recorded",
    receiptNote: "",
    referenceKind: defaultKind,
  });

  function set<K extends keyof OfficialFilingValues>(key: K, value: OfficialFilingValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <form
      className="applicant-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      <fieldset>
        <legend>Official filing</legend>
        <label className="applicant-field">
          <span className="applicant-label">Official registration number<em> *</em></span>
          <input
            value={values.registrationNumber}
            onChange={(event) => set("registrationNumber", event.target.value)}
            required
            autoComplete="off"
          />
        </label>
        <div className="applicant-row">
          <label className="applicant-field">
            <span className="applicant-label">Date filed<em> *</em></span>
            <input type="date" value={values.filedAt} onChange={(event) => set("filedAt", event.target.value)} required />
          </label>
          <label className="applicant-field">
            <span className="applicant-label">Date received</span>
            <input type="date" value={values.receivedAt} onChange={(event) => set("receivedAt", event.target.value)} />
          </label>
        </div>
        <label className="applicant-field">
          <span className="applicant-label">Payment on the official channel</span>
          <select
            value={values.paymentResult}
            onChange={(event) => set("paymentResult", event.target.value as OfficialFilingValues["paymentResult"])}
          >
            <option value="not-recorded">Not recorded</option>
            <option value="paid">Paid on the official channel</option>
            <option value="exempt">Fee exempt (BPL or no-fee filing)</option>
            <option value="failed">Payment failed</option>
          </select>
        </label>
        <label className="applicant-field">
          <span className="applicant-label">Receipt or note</span>
          <textarea
            rows={3}
            value={values.receiptNote}
            onChange={(event) => set("receiptNote", event.target.value)}
            maxLength={400}
          />
        </label>
      </fieldset>
      <p className="applicant-boundary">
        These dates start Praja&apos;s deadline reminders. They are what you recorded, not a government confirmation.
      </p>
      {error && <p className="step-error" role="alert">{error}</p>}
      <div className="step-actions">
        <button type="submit" className="primary-button" disabled={busy}>
          {busy ? "Saving…" : "Save official details"}
        </button>
      </div>
    </form>
  );
}

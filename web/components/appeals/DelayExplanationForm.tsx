"use client";

export default function DelayExplanationForm({
  value,
  onChange,
  needed,
}: {
  value: string;
  onChange: (next: string) => void;
  needed: boolean;
}) {
  if (!needed && !value) return null;
  return (
    <label className="applicant-field">
      <span className="applicant-label">
        Delay explanation{needed ? <em> *</em> : ""}
      </span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} maxLength={1200} />
      <small className="applicant-hint">
        If the limitation period has passed, the Commission or FAA may still condone the delay if you explain it.
      </small>
    </label>
  );
}

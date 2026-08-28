"use client";

import type { ComplaintGround } from "@/lib/domain/case";
import { COMPLAINT_GROUND_LABEL } from "@/lib/domain/case";

const GROUNDS: ComplaintGround[] = [
  "UNABLE_TO_SUBMIT",
  "REFUSED_ACCESS",
  "NO_RESPONSE",
  "UNREASONABLE_FEE",
  "INCOMPLETE_MISLEADING_FALSE",
  "OTHER_SECTION_18",
];

export default function ComplaintGroundsForm({
  value,
  onChange,
}: {
  value: ComplaintGround | null;
  onChange: (next: ComplaintGround) => void;
}) {
  return (
    <fieldset className="applicant-choice">
      <legend className="applicant-label">Section 18 ground<em> *</em></legend>
      <div className="applicant-choice-options case-choice-stack">
        {GROUNDS.map((ground) => (
          <label key={ground} className={value === ground ? "is-selected" : ""}>
            <input type="radio" name="complaint-ground" checked={value === ground} onChange={() => onChange(ground)} />
            <span>{COMPLAINT_GROUND_LABEL[ground]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

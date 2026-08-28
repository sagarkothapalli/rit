"use client";

import type { FirstAppealGround } from "@/lib/domain/case";
import { FIRST_APPEAL_GROUND_LABEL } from "@/lib/domain/case";

const GROUNDS: FirstAppealGround[] = [
  "REFUSED_ACCESS",
  "NO_RESPONSE",
  "UNREASONABLE_FEE",
  "INCOMPLETE_MISLEADING_FALSE",
  "OTHER",
];

export default function AppealGroundsForm({
  value,
  onChange,
}: {
  value: FirstAppealGround | null;
  onChange: (next: FirstAppealGround) => void;
}) {
  return (
    <fieldset className="applicant-choice">
      <legend className="applicant-label">Ground for appeal<em> *</em></legend>
      <div className="applicant-choice-options case-choice-stack">
        {GROUNDS.map((ground) => (
          <label key={ground} className={value === ground ? "is-selected" : ""}>
            <input
              type="radio"
              name="appeal-ground"
              checked={value === ground}
              onChange={() => onChange(ground)}
            />
            <span>{FIRST_APPEAL_GROUND_LABEL[ground]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

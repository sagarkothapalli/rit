"use client";

import {
  AREA_STATUSES,
  COUNTRIES,
  EDUCATIONAL_STATUSES,
  GENDERS,
  lookupPincode,
  problemFor,
  STATES,
  type ApplicantDetails,
  type FieldProblem,
} from "@/lib/applicant";

/* ============================================================
   Applicant particulars. Field set, order, and mandatory marks
   mirror the official RTI Online request form so nothing is a
   surprise when the citizen transcribes it.
   ============================================================ */

interface ApplicantFormProps {
  value: ApplicantDetails;
  onChange: (next: ApplicantDetails) => void;
  problems: FieldProblem[];
  /** Fields the voice agent filled, shown as confirm-me rather than blank. */
  prefilled?: ReadonlySet<keyof ApplicantDetails>;
  /** Email is locked once verified, so the record matches the verified address. */
  emailLocked?: boolean;
}

export default function ApplicantForm({
  value,
  onChange,
  problems,
  prefilled,
  emailLocked = false,
}: ApplicantFormProps) {
  function set<K extends keyof ApplicantDetails>(key: K, next: ApplicantDetails[K]) {
    onChange({ ...value, [key]: next });
  }

  function handlePincodeChange(raw: string) {
    const pincode = raw.replace(/\D/g, "").slice(0, 6);
    if (pincode.length === 6) {
      const match = lookupPincode(pincode);
      if (match) {
        onChange({
          ...value,
          pincode,
          state: match.state,
          areaStatus: match.areaStatus,
        });
        return;
      }
    }
    set("pincode", pincode);
  }

  const err = (field: keyof ApplicantDetails) => problemFor(problems, field);
  const wasPrefilled = (field: keyof ApplicantDetails) => Boolean(prefilled?.has(field));

  return (
    <div className="applicant-form">
      {prefilled && prefilled.size > 0 && (
        <p className="applicant-prefill-note">
          The marked fields were taken from your conversation with the RTI agent. Check each one before continuing.
        </p>
      )}

      <fieldset>
        <legend>Applicant</legend>

        <Field label="Full name" required error={err("name")} hint={wasPrefilled("name") ? "From your conversation" : undefined}>
          <input
            value={value.name}
            onChange={(event) => set("name", event.target.value)}
            autoComplete="name"
            maxLength={160}
          />
        </Field>

        <Choice
          label="Gender"
          required
          error={err("gender")}
          name="applicant-gender"
          options={GENDERS}
          value={value.gender}
          onChange={(next) => set("gender", next)}
        />
      </fieldset>

      <fieldset>
        <legend>Address for the reply</legend>

        <Field label="Postal address" required error={err("address")} hint={wasPrefilled("address") ? "From your conversation" : undefined}>
          <textarea
            value={value.address}
            onChange={(event) => set("address", event.target.value)}
            autoComplete="street-address"
            rows={3}
            maxLength={800}
          />
        </Field>

        <div className="applicant-row">
          <Field label="PIN code" error={err("pincode")}>
            <input
              value={value.pincode}
              onChange={(event) => handlePincodeChange(event.target.value)}
              inputMode="numeric"
              autoComplete="postal-code"
            />
          </Field>

          <Field label="State or Union Territory" required error={err("state")}>
            <select value={value.state} onChange={(event) => set("state", event.target.value)}>
              <option value="">Select</option>
              {STATES.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </Field>

          <Field
            label="Country"
            required
            note="(Change if you are not from India)"
            error={err("country")}
          >
            <select
              value={value.country}
              onChange={(event) => set("country", event.target.value as ApplicantDetails["country"])}
            >
              {COUNTRIES.map((country) => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="applicant-row">
          <Choice
            label="Status"
            required
            name="applicant-area"
            options={AREA_STATUSES}
            value={value.areaStatus}
            onChange={(next) => set("areaStatus", next)}
          />
          <Choice
            label="Educational status"
            required
            name="applicant-education"
            options={EDUCATIONAL_STATUSES}
            value={value.educationalStatus}
            onChange={(next) => set("educationalStatus", next)}
          />
        </div>
      </fieldset>

      <fieldset>
        <legend>Contact</legend>

        <Field label="Mobile number" required error={err("mobile")} hint="Used for SMS alerts on the official portal.">
          <input
            value={value.mobile}
            onChange={(event) => set("mobile", event.target.value.replace(/\D/g, "").slice(0, 10))}
            inputMode="tel"
            autoComplete="tel"
          />
        </Field>

        <Field
          label="Email address"
          required
          error={err("email")}
          hint={emailLocked ? "Verified. Sign out to change it." : undefined}
        >
          <input
            type="email"
            value={value.email}
            onChange={(event) => set("email", event.target.value)}
            autoComplete="email"
            readOnly={emailLocked}
            maxLength={254}
          />
        </Field>
      </fieldset>

      <fieldset>
        <legend>Fee and citizenship</legend>

        <Field label="Citizenship" required>
          <input value={value.citizenship} readOnly aria-describedby="citizenship-hint" />
        </Field>
        <p className="applicant-hint" id="citizenship-hint">
          Only Indian citizens can file under the RTI Act, 2005.
        </p>

        <label className="applicant-check">
          <input
            type="checkbox"
            checked={value.isBpl}
            onChange={(event) => set("isBpl", event.target.checked)}
          />
          <span>
            I am below the poverty line. No application fee is payable, and a copy of the BPL certificate issued
            by the appropriate government must be attached.
          </span>
        </label>
      </fieldset>

      <p className="applicant-boundary">
        Never attach an Aadhaar card, PAN card, or any other identity document. The official portal forbids it —
        only a BPL certificate may be uploaded.
      </p>
    </div>
  );
}

function Field({
  label,
  required = false,
  note,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  note?: string;
  error?: string | null;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`applicant-field${error ? " has-error" : ""}`}>
      <span className="applicant-label">
        {label}
        {required && <em aria-hidden="true"> *</em>}
        {required && <span className="sr-only"> (required)</span>}
        {note && <span className="applicant-label-note"> {note}</span>}
      </span>
      {children}
      {hint && !error && <small className="applicant-hint">{hint}</small>}
      {error && <small className="applicant-error" role="alert">{error}</small>}
    </label>
  );
}

function Choice<T extends string>({
  label,
  required = false,
  error,
  name,
  options,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  error?: string | null;
  name: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <fieldset className={`applicant-choice${error ? " has-error" : ""}`}>
      <legend className="applicant-label">
        {label}
        {required && <em aria-hidden="true"> *</em>}
      </legend>
      <div className="applicant-choice-options">
        {options.map((option) => (
          <label key={option} className={value === option ? "is-selected" : ""}>
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
      {error && <small className="applicant-error" role="alert">{error}</small>}
    </fieldset>
  );
}

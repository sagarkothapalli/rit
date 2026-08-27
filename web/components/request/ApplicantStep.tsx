"use client";

import ApplicantForm from "@/components/ApplicantForm";
import EmailVerification from "@/components/EmailVerification";
import type { ApplicantDetails, FieldProblem } from "@/lib/applicant";

/* ============================================================
   Step 7. Applicant particulars.

   Same field set as the official RTI Online form. If the voice
   assistant already collected these, they arrive prefilled and
   marked, so this step becomes a confirmation rather than a
   second round of typing.
   ============================================================ */

interface ApplicantStepProps {
  applicant: ApplicantDetails;
  setApplicant: (next: ApplicantDetails) => void;
  problems: FieldProblem[];
  prefilled: ReadonlySet<keyof ApplicantDetails>;
  emailVerified: boolean;
  onVerified: (email: string) => void;
  onSignOut: () => void;
  error: string | null;
  onContinue: () => void;
  onBack: () => void;
}

export default function ApplicantStep({
  applicant,
  setApplicant,
  problems,
  prefilled,
  emailVerified,
  onVerified,
  onSignOut,
  error,
  onContinue,
  onBack,
}: ApplicantStepProps) {
  return (
    <div className="step-body">
      <h1>Your details.</h1>
      <p className="step-lede">
        The authority needs these to identify you and to send the reply. They are the same particulars the official
        RTI form asks for.
      </p>

      <section className="applicant-verify">
        <h2>Email verification</h2>
        <EmailVerification
          email={applicant.email}
          onEmailChange={(email) => setApplicant({ ...applicant, email })}
          onVerified={onVerified}
          onSignOut={onSignOut}
        />
      </section>

      <ApplicantForm
        value={applicant}
        onChange={setApplicant}
        problems={problems}
        prefilled={prefilled}
        emailLocked={emailVerified}
      />

      {error && <p className="step-error" role="alert">{error}</p>}

      <div className="step-actions">
        <button type="button" className="primary-button" onClick={onContinue}>
          Build my application PDF
        </button>
        <button type="button" className="ghost-button" onClick={onBack}>Back</button>
      </div>
    </div>
  );
}

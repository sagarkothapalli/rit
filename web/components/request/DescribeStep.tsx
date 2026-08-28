"use client";

import { languageLabel } from "./steps";

/* ============================================================
   Step 2. The transcript and the editable text are one surface,
   not a collapsed panel: correcting your own words is the most
   likely thing a citizen does here, so it must not be hidden
   behind a summary toggle.
   ============================================================ */

interface SpeechLike {
  status: string;
  finalText: string;
  interimText: string;
  error: string | null;
  supported: boolean;
}

interface DescribeStepProps {
  lang: string;
  intakeMode: "assistant" | "manual" | null;
  listening: boolean;
  speech: SpeechLike;
  correction: string;
  onCorrection: (value: string) => void;
  onTakeOver: () => void;
  onStart: () => void;
  onStop: () => void;
  busy: boolean;
  error: string | null;
  onContinue: () => void;
  onBack: () => void;
  photos?: Array<{ fileName: string; scene: string; confirmed: boolean; mode: string }>;
  photoError?: string | null;
  onAddPhoto?: (file: File) => void;
  onConfirmPhoto?: (index: number, confirmed: boolean) => void;
}

export default function DescribeStep({
  lang,
  intakeMode,
  listening,
  speech,
  correction,
  onCorrection,
  onTakeOver,
  onStart,
  onStop,
  busy,
  error,
  onContinue,
  onBack,
  photos = [],
  photoError = null,
  onAddPhoto,
  onConfirmPhoto,
}: DescribeStepProps) {
  const fromAssistant = intakeMode === "assistant";

  return (
    <div className="step-body">
      <h1>{fromAssistant ? "Check what we heard." : "Describe the problem."}</h1>
      <p className="step-lede">
        {fromAssistant
          ? "This is what the RTI agent captured. Correct anything that is wrong or add what is missing — nothing is prepared until you continue."
          : "Write it the way you would explain it to a person. Plain words are fine; we turn it into formal wording for you."}
      </p>

      <p className="step-meta">Language: <strong>{languageLabel(lang)}</strong></p>

      {speech.supported && (
        <div className="dictate-row">
          <button
            type="button"
            onClick={listening ? onStop : onStart}
            className={`dictate-button${listening ? " is-listening" : ""}`}
            aria-label={listening ? "Stop dictation" : "Start dictation"}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {listening ? (
                <rect x="7" y="7" width="10" height="10" rx="1.5" />
              ) : (
                <>
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                </>
              )}
            </svg>
            {listening ? "Stop dictation" : "Dictate instead"}
          </button>
          <span className="dictate-status" role="status">
            {listening ? "Listening. Your words appear below." : "Optional — you can simply type."}
          </span>
        </div>
      )}

      {speech.error && <p className="step-error" role="alert">{speech.error}</p>}

      {listening && (speech.finalText || speech.interimText) && (
        <div className="live-transcript" aria-live="polite">
          {speech.finalText}
          {speech.interimText && <span className="live-interim"> {speech.interimText}</span>}
        </div>
      )}

      <label className="describe-field">
        <span className="describe-label">Your concern, in your own words</span>
        <textarea
          value={correction}
          onChange={(event) => onCorrection(event.target.value)}
          onFocus={() => {
            if (listening) onStop();
            else onTakeOver();
          }}
          rows={8}
          placeholder="For example: the road in our colony was dug up eight months ago and never repaired. We want to know what work was approved, who the contractor was, and whether it was inspected."
        />
        <small className="describe-count">{correction.trim().length} characters</small>
      </label>

      {onAddPhoto && (
        <div className="photo-evidence">
          <span className="applicant-label">Photographs of the incident (optional, up to 3)</span>
          <input
            type="file"
            accept="image/jpeg,image/png,.jpg,.jpeg,.png"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onAddPhoto(file);
            }}
          />
          {photoError && <p className="step-error">{photoError}</p>}
          {photos.map((photo, index) => (
            <label key={`${photo.fileName}-${index}`} className="applicant-check">
              <input
                type="checkbox"
                checked={photo.confirmed}
                onChange={(event) => onConfirmPhoto?.(index, event.target.checked)}
              />
              <span>
                {photo.fileName}: {photo.scene} {photo.mode === "DETERMINISTIC_DEMO" ? "(demo analysis)" : ""}
              </span>
            </label>
          ))}
        </div>
      )}

      {error && <p className="step-error" role="alert">{error}</p>}

      <div className="step-actions">
        <button type="button" className="primary-button" onClick={onContinue} disabled={busy}>
          {busy ? "Reading your words…" : "Continue"}
        </button>
        <button type="button" className="ghost-button" onClick={onBack}>Back</button>
      </div>
    </div>
  );
}

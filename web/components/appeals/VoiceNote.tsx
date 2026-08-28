"use client";

import { useState } from "react";
import { useSpeech } from "@/hooks/useSpeech";
import { extractAppealFacts, type ExtractedAppealFacts } from "@/lib/appeals/extract";

export default function VoiceNote({
  label,
  value,
  onChange,
  lang = "en-IN",
  guided = false,
  onExtracted,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  lang?: string;
  guided?: boolean;
  onExtracted?: (facts: ExtractedAppealFacts) => void;
}) {
  const speech = useSpeech(lang);
  const listening = speech.status === "listening";
  const [facts, setFacts] = useState<ExtractedAppealFacts | null>(null);

  function applySpoken(spoken: string) {
    const next = value ? `${value} ${spoken}`.trim() : spoken;
    onChange(next);
    if (guided && spoken) {
      const extracted = extractAppealFacts(spoken);
      setFacts(extracted);
      onExtracted?.(extracted);
    }
  }

  return (
    <label className="applicant-field">
      <span className="applicant-label">{label}</span>
      <textarea
        value={listening ? [value, speech.interimText].filter(Boolean).join(" ") : value}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        maxLength={4000}
      />
      {speech.supported && (
        <button
          type="button"
          className="link-button"
          onClick={() => {
            if (listening) {
              speech.stop();
              const spoken = [speech.finalText, speech.interimText].filter(Boolean).join(" ").trim();
              if (spoken) applySpoken(spoken);
              return;
            }
            speech.reset();
            speech.start();
          }}
        >
          {listening ? "Stop listening" : guided ? "Speak what happened" : "Speak this part"}
        </button>
      )}
      {facts && (
        <div className="voice-extract">
          <p className="applicant-hint">From what you said:</p>
          {facts.registrationNumbers.length > 0 && <p>References: {facts.registrationNumbers.join(", ")}</p>}
          {facts.dates.length > 0 && <p>Dates: {facts.dates.join(", ")}</p>}
          {facts.groundHint && <p>Likely ground: {facts.groundHint.replaceAll("_", " ").toLowerCase()}</p>}
          <p>{facts.grounds}</p>
        </div>
      )}
    </label>
  );
}

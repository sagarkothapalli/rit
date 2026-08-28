"use client";

import { useSpeech } from "@/hooks/useSpeech";

export default function VoiceNote({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const speech = useSpeech("en-IN");
  const listening = speech.status === "listening";
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
              if (spoken) onChange(value ? `${value} ${spoken}` : spoken);
              return;
            }
            speech.reset();
            speech.start();
          }}
        >
          {listening ? "Stop listening" : "Speak this part"}
        </button>
      )}
    </label>
  );
}

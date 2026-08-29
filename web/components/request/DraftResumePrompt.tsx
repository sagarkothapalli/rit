"use client";

import { useEffect, useRef } from "react";

interface DraftResumePromptProps {
  title?: string;
  subtitle?: string;
  snippet?: string;
  stepLabel?: string;
  languageLabel?: string;
  capturedAt?: number;
  onContinue: () => void;
  onStartFresh: () => void;
  isSection18?: boolean;
}

function ClockIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function FileTextIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z" />
    </svg>
  );
}

function formatRelativeTime(timestamp?: number): string {
  if (!timestamp) return "Earlier session";
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function DraftResumePrompt({
  title = "In-progress complaint found",
  subtitle = "You have an unfiled complaint from an earlier session. Would you like to stay on your older complaint or start fresh?",
  snippet,
  stepLabel,
  languageLabel,
  capturedAt,
  onContinue,
  onStartFresh,
  isSection18 = false,
}: DraftResumePromptProps) {
  const continueBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    // Focus the primary action on mount for accessibility
    continueBtnRef.current?.focus();
  }, []);

  return (
    <div
      className="draft-prompt-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="draft-prompt-heading"
      aria-describedby="draft-prompt-desc"
    >
      <div className="draft-prompt-card">
        <div className="draft-prompt-badge">
          <ClockIcon />
          <span>{isSection18 ? "Section 18 Draft" : "Complaint Draft"}</span>
        </div>

        <h2 id="draft-prompt-heading" className="draft-prompt-title">
          {title}
        </h2>

        <p id="draft-prompt-desc" className="draft-prompt-lede">
          {subtitle}
        </p>

        <div className="draft-prompt-preview">
          <div className="draft-prompt-meta">
            <span className="draft-prompt-meta-item">
              <ClockIcon />
              {formatRelativeTime(capturedAt)}
            </span>
            {stepLabel && (
              <span className="draft-prompt-meta-item">
                <FileTextIcon />
                {stepLabel}
              </span>
            )}
            {languageLabel && (
              <span className="draft-prompt-meta-item">
                🌐 {languageLabel}
              </span>
            )}
          </div>

          {snippet && (
            <p className="draft-prompt-excerpt">
              &ldquo;{snippet.length > 240 ? `${snippet.slice(0, 240)}…` : snippet}&rdquo;
            </p>
          )}
        </div>

        <div className="draft-prompt-actions">
          <button
            ref={continueBtnRef}
            type="button"
            className="primary-button"
            onClick={onContinue}
          >
            <FileTextIcon />
            Continue Complaint
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={onStartFresh}
          >
            <SparklesIcon />
            Make a New Complaint (Start Fresh)
          </button>
        </div>

        <p className="applicant-hint" style={{ marginTop: "16px" }}>
          Selecting <strong>Make a New Complaint</strong> deletes older draft records, clears cached progress, and starts completely fresh from step one.
        </p>
      </div>
    </div>
  );
}

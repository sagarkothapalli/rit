"use client";

import { useState } from "react";

const requestText = `Praja RTI preparation

1. Certified copy of the work order and sanctioned budget for Road 12, Sector 4.
2. Contractor details, scheduled completion date, and delay clauses recorded for the work.
3. Copies of quality inspection reports submitted for the road work.

This draft has not been filed with a government system.`;

function CopyIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <rect height="13" rx="2" stroke="currentColor" strokeWidth="1.6" width="11" x="8" y="7" />
      <path d="M16 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 20h14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

export default function HeroDraftActions() {
  const [copied, setCopied] = useState(false);

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(requestText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function downloadDraft() {
    const blob = new Blob([requestText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "praja-rti-request.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="draft-actions" aria-label="Draft actions">
      <button onClick={copyDraft} type="button">
        <CopyIcon />
        {copied ? "Copied" : "Copy"}
      </button>
      <button onClick={downloadDraft} type="button">
        <DownloadIcon />
        Download
      </button>
      <span className="sr-only" aria-live="polite">{copied ? "Draft copied to clipboard" : ""}</span>
    </div>
  );
}

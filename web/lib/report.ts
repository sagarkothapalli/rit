import type { Draft, Notes } from "@/lib/cage/schemas";

export interface ApplicationReport {
  reference: string;
  generated_at: string;
  government_submission_status: "NOT_SUBMITTED";
  title: string;
  authority: { name: string; ministry: string };
  notes: {
    records_sought: string[];
    date_range: string | null;
    place: string | null;
    body_hint: string | null;
    format: string;
  } | null;
  requests: string[];
  transcript: string;
  disclaimer: string;
}

const DISCLAIMER =
  "Independent Praja RTI preparation report. Not filed with any government system. Copy these requests into RTI Online if you choose to file.";

export function buildReport(input: {
  reference: string;
  transcript: string;
  notes: Notes | null;
  draft: Draft | null;
  authorityName: string;
  ministry: string;
}): ApplicationReport {
  return {
    reference: input.reference,
    generated_at: new Date().toISOString(),
    government_submission_status: "NOT_SUBMITTED",
    title: input.draft?.title ?? "RTI application",
    authority: { name: input.authorityName, ministry: input.ministry },
    notes: input.notes
      ? {
          records_sought: input.notes.records_sought,
          date_range: input.notes.date_range ?? null,
          place: input.notes.place ?? null,
          body_hint: input.notes.body_hint ?? null,
          format: input.notes.format,
        }
      : null,
    requests: input.draft?.requests ?? [],
    transcript: input.transcript,
    disclaimer: DISCLAIMER,
  };
}

export function formatReportText(report: ApplicationReport): string {
  const lines = [
    "PRAJA RTI — PREPARATION REPORT",
    report.disclaimer,
    "",
    `Reference: ${report.reference}`,
    `Generated: ${report.generated_at}`,
    `Submission: ${report.government_submission_status}`,
    `Authority: ${report.authority.name}`,
    `Ministry: ${report.authority.ministry || "Not selected"}`,
    `Title: ${report.title}`,
    "",
    "REQUESTS",
  ];
  if (report.requests.length === 0) {
    lines.push("(none yet)");
  } else {
    report.requests.forEach((item, i) => lines.push(`${i + 1}. ${item}`));
  }
  if (report.notes) {
    lines.push(
      "",
      "NOTES",
      `Records: ${report.notes.records_sought.join("; ") || "None"}`,
      `Period: ${report.notes.date_range || "Not stated"}`,
      `Place: ${report.notes.place || "Not stated"}`,
      `Format: ${report.notes.format}`,
    );
  }
  if (report.transcript.trim()) {
    lines.push("", "CITIZEN TRANSCRIPT", report.transcript.trim());
  }
  return lines.join("\n");
}

export function reportFilename(reference: string, ext: "txt" | "json"): string {
  const slug = reference.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug || "praja-rti-report"}.${ext}`;
}

export function downloadText(filename: string, contents: string, type: string): void {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

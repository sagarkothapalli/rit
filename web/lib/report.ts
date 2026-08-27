import type { Draft, Notes } from "@/lib/cage/schemas";

export interface ApplicationReport {
  reference: string;
  generated_at: string;
  government_submission_status: "NOT_SUBMITTED";
  title: string;
  authority: { name: string; ministry: string };
  /** Which level of government holds the records, and where it must be filed. */
  jurisdiction: "central" | "state" | "unclear";
  filing_channel: string | null;
  notes: {
    records_sought: string[];
    date_range: string | null;
    place: string | null;
    body_hint: string | null;
    format: string;
  } | null;
  /** Neutral opening context of the application, before the numbered points. */
  background: string;
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
    jurisdiction: input.notes?.jurisdiction ?? "unclear",
    filing_channel: input.notes?.filing_channel ?? null,
    notes: input.notes
      ? {
          records_sought: input.notes.records_sought,
          date_range: input.notes.date_range ?? null,
          place: input.notes.place ?? null,
          body_hint: input.notes.body_hint ?? null,
          format: input.notes.format,
        }
      : null,
    background: input.draft?.background ?? "",
    requests: input.draft?.requests ?? [],
    transcript: input.transcript,
    disclaimer: DISCLAIMER,
  };
}

/**
 * The exact text a citizen pastes into the portal's single free-text field.
 * Built from the same pieces as the PDF so the two can never disagree.
 */
export function applicationText(report: ApplicationReport): string {
  const parts: string[] = [];
  if (report.background.trim()) parts.push(report.background.trim());
  report.requests.forEach((request, index) => parts.push(`${index + 1}. ${request.trim()}`));
  const details: string[] = [];
  if (report.notes?.place) details.push(`Place / project: ${report.notes.place}`);
  if (report.notes?.date_range) details.push(`Period: ${report.notes.date_range}`);
  if (report.notes?.format) details.push(`Preferred format: ${report.notes.format}`);
  if (details.length) parts.push(details.join("\n"));
  return parts.join("\n\n");
}

/** Character count against the portal's 3,000 character field limit. */
export function applicationLength(report: ApplicationReport): number {
  return applicationText(report).length;
}

/**
 * The portal rejects anything outside this set in its text field.
 * Reporting the offending characters is more useful than a bare count.
 */
const PORTAL_ALLOWED = /[^A-Za-z0-9\s,.\-_()/@:&?\\%]/g;

export function disallowedCharacters(report: ApplicationReport): string[] {
  const found = applicationText(report).match(PORTAL_ALLOWED);
  if (!found) return [];
  return [...new Set(found)].slice(0, 12);
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
    `Jurisdiction: ${report.jurisdiction}`,
    `File through: ${report.filing_channel || "Not determined"}`,
    `Subject: ${report.title}`,
    "",
    "APPLICATION TEXT",
    applicationText(report),
  ];
  if (report.notes) {
    lines.push(
      "",
      "EXTRACTED INTENT",
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

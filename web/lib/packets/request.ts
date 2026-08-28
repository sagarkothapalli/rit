import { createApplicationPdf, createReceiptPdf } from "@/lib/application-pdf";
import type { CaseRecord, RequestDraftPayload } from "@/lib/domain/case";
import { coveringStatement } from "@/lib/filing-rules/portal-text";
import { jsPDF } from "jspdf";
import { addFooter, headingBand, paragraph } from "./shared";

export { createApplicationPdf };

export function createFullRequestPdf(record: CaseRecord): Blob {
  const payload = record.draft.payload as RequestDraftPayload;
  const text = payload.report
    ? [payload.report.background, ...payload.report.requests.map((item, index) => `${index + 1}. ${item}`)].join("\n\n")
    : payload.portalText;
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const page = { value: 1 };
  headingBand(doc, "FULL RTI REQUEST (SUPPORTING DOCUMENT)", "Enclosed because the portal text field is too short");
  let y = 42; // advances through the document
  y = paragraph(
    doc,
    coveringStatement(record.title),
    y,
    page,
    "Full request",
  );
  y = paragraph(doc, text || "No request text.", y + 6, page, "Full request");
  void y;
  addFooter(doc, page.value, "Full request");
  return doc.output("blob");
}

export function receiptFromCase(record: CaseRecord) {
  return createReceiptPdf({
    acknowledgementNumber: record.prajaReference,
    reference: record.prajaReference,
    createdAt: record.createdAt,
    status: "PRAJA_ACKNOWLEDGED",
    governmentSubmissionStatus: "NOT_SUBMITTED",
    applicant: record.applicant,
    report: record.draft.payload.kind === "RTI_REQUEST" && record.draft.payload.report
      ? record.draft.payload.report
      : {
          reference: record.prajaReference,
          generated_at: record.updatedAt,
          government_submission_status: "NOT_SUBMITTED",
          title: record.title,
          authority: { name: record.authorityName, ministry: record.authorityLevel ?? "" },
          jurisdiction: record.jurisdiction === "STATE" ? "state" : record.jurisdiction === "CENTRAL" ? "central" : "unclear",
          filing_channel: record.filingChannel,
          notes: null,
          background: "",
          requests: [record.title],
          transcript: "",
          disclaimer: "Independent Praja RTI preparation record. Not filed with any government system.",
        },
  });
}

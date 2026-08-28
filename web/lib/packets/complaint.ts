import { jsPDF } from "jspdf";
import type { CaseRecord, ComplaintDraftPayload } from "@/lib/domain/case";
import { COMPLAINT_GROUND_LABEL } from "@/lib/domain/case";
import { addFooter, field, headingBand, paragraph } from "./shared";

export function createComplaintPdf(record: CaseRecord): Blob {
  const draft = record.draft.payload as ComplaintDraftPayload;
  const dest = record.jurisdiction === "STATE" ? "the State Information Commission" : "the Central Information Commission";
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const page = { value: 1 };
  headingBand(doc, "COMPLAINT UNDER SECTION 18", "Right to Information Act, 2005");
  let y = 42; // advances through the document
  y = field(doc, "Praja reference", record.prajaReference, y, page, "Section 18 complaint");
  y = field(doc, "To", dest, y, page, "Section 18 complaint");
  y = field(doc, "Public authority", record.authorityName, y, page, "Section 18 complaint");
  y = field(doc, "Ground", draft.ground ? COMPLAINT_GROUND_LABEL[draft.ground] : "Not selected", y, page, "Section 18 complaint");
  y = field(doc, "Related RTI", draft.relatedRtiExists ? "Yes" : "No — request could not be submitted", y, page, "Section 18 complaint");
  if (draft.unableToSubmitReason.trim()) {
    y = paragraph(doc, `Why the request could not be submitted:\n${draft.unableToSubmitReason}`, y + 4, page, "Section 18 complaint");
  }
  if (draft.lifeOrLibertyExplanation.trim()) {
    y = paragraph(doc, `Life or liberty:\n${draft.lifeOrLibertyExplanation}`, y + 4, page, "Section 18 complaint");
  }
  if (draft.publicAuthorityJustification.trim()) {
    y = paragraph(doc, `Why the body is a public authority:\n${draft.publicAuthorityJustification}`, y + 4, page, "Section 18 complaint");
  }
  y = paragraph(doc, draft.facts || "Facts not yet written.", y + 4, page, "Section 18 complaint");
  y = paragraph(doc, `Relief sought:\n${draft.relief || "Not stated."}`, y + 4, page, "Section 18 complaint");
  y = paragraph(
    doc,
    "A Section 18 complaint is not a substitute for a first or second appeal. This document is prepared with Praja RTI and has not been filed with the Commission by this workspace.",
    y + 8,
    page,
    "Section 18 complaint",
  );
  addFooter(doc, page.value, "Section 18 complaint");
  void y;
  return doc.output("blob");
}

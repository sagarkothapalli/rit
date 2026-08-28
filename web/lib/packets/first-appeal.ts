import { jsPDF } from "jspdf";
import type { CaseRecord, FirstAppealDraftPayload } from "@/lib/domain/case";
import { FIRST_APPEAL_GROUND_LABEL } from "@/lib/domain/case";
import { addFooter, applicantFields, field, headingBand, paragraph } from "./shared";

export function createFirstAppealPdf(record: CaseRecord): Blob {
  const draft = record.draft.payload as FirstAppealDraftPayload;
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const page = { value: 1 };
  headingBand(doc, "FIRST APPEAL UNDER SECTION 19(1)", "Right to Information Act, 2005");
  let y = 42; // advances through the document
  y = field(doc, "Praja reference", record.prajaReference, y, page, "First appeal");
  y = field(doc, "To", `The First Appellate Authority, ${draft.faaName || record.authorityName}`, y, page, "First appeal");
  y = applicantFields(doc, record, y, page, "First appeal");
  y = field(doc, "CPIO / SPIO", [draft.pioName, draft.pioDesignation].filter(Boolean).join(", ") || "Not stated", y, page, "First appeal");
  y = field(doc, "FAA", [draft.faaName, draft.faaDesignation].filter(Boolean).join(", ") || "Not stated", y, page, "First appeal");
  y = field(doc, "Original RTI no.", draft.originalRegistrationNumber || "To be entered", y, page, "First appeal");
  y = field(doc, "Original filed", draft.originalFiledAt || "Not recorded", y, page, "First appeal");
  y = field(doc, "Ground", draft.ground ? FIRST_APPEAL_GROUND_LABEL[draft.ground] : "Not selected", y, page, "First appeal");
  y = field(doc, "Fee", "Nil — no first-appeal fee on the Central portal under this rule set", y, page, "First appeal");
  if (draft.chronology.trim()) y = paragraph(doc, `Chronology:\n${draft.chronology}`, y + 4, page, "First appeal");
  if (draft.originalRequestSummary.trim()) {
    y = paragraph(doc, `Original request:\n${draft.originalRequestSummary}`, y + 4, page, "First appeal");
  }
  y = paragraph(doc, draft.background || "Background not yet written.", y + 4, page, "First appeal");
  y = paragraph(doc, `Information requested but not supplied:\n${draft.informationNotSupplied || "Not stated."}`, y + 4, page, "First appeal");
  y = paragraph(doc, `Grounds and relief:\n${draft.groundsAndRelief || "Not stated."}`, y + 4, page, "First appeal");
  if (draft.delayExplanation.trim()) {
    y = paragraph(doc, `Delay explanation:\n${draft.delayExplanation}`, y + 4, page, "First appeal");
  }
  y = paragraph(
    doc,
    "I am a citizen of India. This first appeal is prepared with Praja RTI, an independent assistance service. It has not been transmitted to any government system.",
    y + 8,
    page,
    "First appeal",
  );
  addFooter(doc, page.value, "First appeal");
  void y;
  return doc.output("blob");
}

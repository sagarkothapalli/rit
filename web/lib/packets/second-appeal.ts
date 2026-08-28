import { jsPDF } from "jspdf";
import type { CaseRecord, SecondAppealDraftPayload } from "@/lib/domain/case";
import { addFooter, applicantFields, field, headingBand, paragraph } from "./shared";

export function createSecondAppealPdf(record: CaseRecord): Blob {
  const draft = record.draft.payload as SecondAppealDraftPayload;
  const dest =
    draft.destination === "SIC"
      ? "the State Information Commission"
      : draft.destination === "CIC"
        ? "the Central Information Commission"
        : "the Information Commission — confirm Central or State before filing";
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const page = { value: 1 };
  headingBand(doc, "SECOND APPEAL UNDER SECTION 19(3)", "Right to Information Act, 2005");
  let y = 42;
  y = field(doc, "Praja reference", record.prajaReference, y, page, "Second appeal");
  y = field(doc, "To", dest, y, page, "Second appeal");
  y = applicantFields(doc, record, y, page, "Second appeal");
  y = field(doc, "Public authority", record.authorityName, y, page, "Second appeal");
  y = field(doc, "CPIO / SPIO", [draft.pioName, draft.pioDesignation].filter(Boolean).join(", ") || "Not stated", y, page, "Second appeal");
  y = field(doc, "FAA", [draft.faaName, draft.faaDesignation].filter(Boolean).join(", ") || "Not stated", y, page, "Second appeal");
  y = field(doc, "Original RTI no.", draft.originalRegistrationNumber || "Not stated", y, page, "Second appeal");
  y = field(doc, "First appeal no.", draft.firstAppealRegistrationNumber || "Not stated", y, page, "Second appeal");
  y = field(doc, "Copy furnished", draft.furnishedCopyToAuthority ? "Yes" : "Not yet confirmed", y, page, "Second appeal");
  const blocks: Array<[string, string]> = [
    ["Chronology", draft.chronology],
    ["Background", draft.background],
    ["Information sought", draft.informationSought],
    ["Information not provided", draft.informationNotProvided],
    ["Reasons for dissatisfaction", draft.reasonsForDissatisfaction],
    ["Grounds", draft.grounds],
    ["Prayer / relief", draft.prayer],
    ["Compensation", draft.compensationGrounds],
    ["Related Commission order", draft.relatedCommissionOrder],
    ["Delay explanation", draft.delayExplanation],
  ];
  for (const [label, text] of blocks) {
    if (!text.trim()) continue;
    y = paragraph(doc, `${label}\n${text}`, y + 4, page, "Second appeal");
  }
  y = paragraph(
    doc,
    "I am a citizen of India. This second appeal is prepared with Praja RTI and has not been filed with the Commission by this workspace.",
    y + 8,
    page,
    "Second appeal",
  );
  addFooter(doc, page.value, "Second appeal");
  return doc.output("blob");
}

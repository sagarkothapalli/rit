import { jsPDF } from "jspdf";
import type { ApplicantDetails } from "@/lib/applicant";
import type { StoredApplication } from "@/lib/application-records";
import { applicationText, type ApplicationReport } from "@/lib/report";

/* ============================================================
   A4 application PDF. Field order and wording follow the
   official RTI Online request form so a citizen can transcribe
   it field by field, or attach it as the supporting document.
   ============================================================ */

interface ApplicationPdfInput {
  report: ApplicationReport;
  applicant: ApplicantDetails;
  acknowledgementNumber?: string;
}

const NAVY: [number, number, number] = [8, 47, 91];
const INK: [number, number, number] = [23, 32, 45];
const MUTED: [number, number, number] = [75, 89, 106];
const RULE: [number, number, number] = [185, 194, 207];

const LEFT = 18;
const RIGHT = 192;
const LABEL_WIDTH = 52;
const VALUE_X = LEFT + LABEL_WIDTH;
const VALUE_WIDTH = RIGHT - VALUE_X;
const BOTTOM = 268;

function safe(value: string | null | undefined): string {
  return (value ?? "Not stated").replace(/[\u2010-\u2015]/g, "-").replace(/\s+/g, " ").trim() || "Not stated";
}

function addFooter(doc: jsPDF, page: number): void {
  const height = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...RULE);
  doc.line(LEFT, height - 16, RIGHT, height - 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("Praja RTI application preview - not a Government filing or registration", LEFT, height - 10);
  doc.text(`Page ${page}`, RIGHT, height - 10, { align: "right" });
}

function nextPage(doc: jsPDF, page: { value: number }): number {
  addFooter(doc, page.value);
  doc.addPage();
  page.value += 1;
  return 20;
}

/** Label/value row that breaks across pages instead of overflowing. */
function field(doc: jsPDF, page: { value: number }, label: string, value: string, y: number): number {
  const lines = doc.splitTextToSize(safe(value), VALUE_WIDTH) as string[];
  const height = Math.max(7, lines.length * 5);
  let top = y;
  if (top + height > BOTTOM) top = nextPage(doc, page);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(label.toUpperCase(), LEFT, top);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text(lines, VALUE_X, top);
  return top + height + 1.5;
}

function sectionHeading(doc: jsPDF, page: { value: number }, title: string, y: number): number {
  let top = y;
  if (top + 16 > BOTTOM) top = nextPage(doc, page);
  doc.setDrawColor(...RULE);
  doc.line(LEFT, top, RIGHT, top);
  top += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...NAVY);
  doc.text(title, LEFT, top);
  return top + 7;
}

function paragraph(doc: jsPDF, page: { value: number }, text: string, y: number, indent = 0): number {
  const lines = doc.splitTextToSize(text, RIGHT - LEFT - indent) as string[];
  let top = y;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  for (const line of lines) {
    if (top + 5 > BOTTOM) top = nextPage(doc, page);
    doc.text(line, LEFT + indent, top);
    top += 5;
  }
  return top;
}

export function createApplicationPdf(input: ApplicationPdfInput): Blob {
  const { report, applicant } = input;
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const page = { value: 1 };

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, 210, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("APPLICATION UNDER THE RIGHT TO INFORMATION ACT, 2005", LEFT, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Section 6(1) - request for information", LEFT, 22);
  doc.text("Prepared with Praja RTI - not a Government filing", RIGHT, 22, { align: "right" });

  let y = 42;

  /**
   * A State/local-body application must not look like something the citizen
   * can post to the Central portal. Say so on the face of the document,
   * before anything else, because this PDF outlives the browser session.
   */
  if (report.jurisdiction === "state") {
    const notice = doc.splitTextToSize(
      "STATE / LOCAL BODY MATTER. The Central RTI Online portal (rtionline.gov.in) cannot accept this "
      + `application. File it with ${report.authority.name} through ${report.filing_channel ?? "your State RTI channel"}.`,
      RIGHT - LEFT - 12,
    ) as string[];
    const boxHeight = notice.length * 4.4 + 10;
    doc.setFillColor(255, 248, 235);
    doc.setDrawColor(234, 216, 183);
    doc.roundedRect(LEFT, y, RIGHT - LEFT, boxHeight, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(95, 74, 32);
    doc.text(notice, LEFT + 6, y + 7);
    y += boxHeight + 6;
  }

  if (input.acknowledgementNumber) {
    y = field(doc, page, "Praja acknowledgement", input.acknowledgementNumber, y);
  }
  y = field(
    doc,
    page,
    "To",
    `The ${report.jurisdiction === "state" ? "" : "Central "}Public Information Officer, ${report.authority.name}`,
    y,
  );
  y = field(doc, page, report.jurisdiction === "state" ? "Government" : "Ministry / Dept.", report.authority.ministry, y);
  y = field(doc, page, "File through", report.filing_channel ?? "Not determined", y);
  y = field(doc, page, "Date", new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }), y);
  y = field(doc, page, "Subject", report.title, y);

  /* ---------- applicant, in official form order ---------- */
  y = sectionHeading(doc, page, "1. Particulars of the applicant", y + 2);
  y = field(doc, page, "Name", applicant.name, y);
  y = field(doc, page, "Gender", applicant.gender, y);
  y = field(doc, page, "Address", applicant.address, y);
  y = field(doc, page, "PIN code", applicant.pincode || "Not provided", y);
  y = field(doc, page, "State / UT", applicant.state, y);
  y = field(doc, page, "Country", applicant.country, y);
  y = field(doc, page, "Status", applicant.areaStatus, y);
  y = field(doc, page, "Educational status", applicant.educationalStatus, y);
  y = field(doc, page, "Phone", applicant.phone || "Not provided", y);
  y = field(doc, page, "Mobile", applicant.mobile || "Not provided", y);
  y = field(doc, page, "Email", applicant.email, y);
  y = field(doc, page, "Citizenship", applicant.citizenship, y);
  y = field(
    doc,
    page,
    "Below poverty line",
    applicant.isBpl ? "Yes - a copy of the BPL certificate must be attached" : "No",
    y,
  );

  /* ---------- the application text ---------- */
  y = sectionHeading(doc, page, "2. Particulars of information required", y + 2);

  if (report.background.trim()) {
    y = paragraph(doc, page, safe(report.background), y);
    y += 3;
  }

  report.requests.forEach((request, index) => {
    if (y + 6 > BOTTOM) y = nextPage(doc, page);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(`${index + 1}.`, LEFT, y);
    y = paragraph(doc, page, safe(request), y, 8);
    y += 2.5;
  });

  y = field(doc, page, "Period", report.notes?.date_range ?? "Not stated", y + 2);
  y = field(doc, page, "Place / project", report.notes?.place ?? "Not stated", y);
  y = field(doc, page, "Preferred format", report.notes?.format ?? "Certified copies", y);

  /* ---------- fee ---------- */
  y = sectionHeading(doc, page, "3. Fee", y + 2);
  y = field(
    doc,
    page,
    "Application fee",
    applicant.isBpl
      ? "Nil - the applicant is below the poverty line (RTI Rules, 2012)"
      : "Rs 10 as prescribed by the RTI Rules, 2012",
    y,
  );
  y = field(doc, page, "Payment status", "Not paid - no payment is processed by this workspace", y);

  /* ---------- declaration ---------- */
  if (y + 40 > BOTTOM) y = nextPage(doc, page);
  y = sectionHeading(doc, page, "4. Declaration", y + 2);
  y = paragraph(
    doc,
    page,
    "I am a citizen of India and I request the information described above under Section 6(1) of the Right to "
    + "Information Act, 2005. I confirm that the particulars given above are correct to the best of my knowledge. "
    + "This document was prepared using Praja RTI, an independent citizen assistance service, and has not been "
    + "transmitted to any Government system.",
    y,
  );

  y += 12;
  if (y + 16 > BOTTOM) y = nextPage(doc, page);
  doc.setDrawColor(...RULE);
  doc.line(LEFT, y, LEFT + 60, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("Signature of the applicant", LEFT, y + 5);
  doc.text(safe(applicant.name), LEFT, y + 10);

  /* ---------- portal transcription aid ---------- */
  const portalText = applicationText(report);
  y = nextPage(doc, page);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text("Text for the request form field", LEFT, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  y = paragraph(
    doc,
    page,
    report.jurisdiction === "state"
      ? `Copy the text below into the application form of ${report.filing_channel ?? "your State RTI channel"}. `
        + `Length: ${portalText.length} characters.`
      : `Copy the text below into the "Text for RTI Request application" field on rtionline.gov.in. `
        + `Length: ${portalText.length} of the 3,000 characters the portal accepts.`,
    y,
  );
  y += 3;
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  for (const block of portalText.split("\n")) {
    if (!block.trim()) {
      y += 3;
      continue;
    }
    y = paragraph(doc, page, block, y);
  }

  addFooter(doc, page.value);
  return doc.output("blob");
}

export function createReceiptPdf(record: Omit<StoredApplication, "receiptPdfBase64" | "applicationPdfBase64">): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const page = { value: 1 };
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, 210, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("PRAJA RTI ACKNOWLEDGEMENT", LEFT, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Local receipt for a stored application copy", LEFT, 27);

  let y = 54;
  y = field(doc, page, "Acknowledgement no.", record.acknowledgementNumber, y);
  y = field(doc, page, "Created", new Date(record.createdAt).toLocaleString("en-IN"), y);
  y = field(doc, page, "Applicant", record.applicant.name, y);
  y = field(doc, page, "Email", record.applicant.email, y);
  y = field(doc, page, "Mobile", record.applicant.mobile || "Not provided", y);
  y = field(doc, page, "Subject", record.report.title, y);
  y = field(doc, page, "Selected authority", record.report.authority.name, y);
  y = field(doc, page, "Ministry / Government", record.report.authority.ministry, y);
  y = field(doc, page, "Jurisdiction", record.report.jurisdiction === "state" ? "State / local body" : "Central", y);
  y = field(doc, page, "File through", record.report.filing_channel ?? "Not determined", y);
  y = field(doc, page, "Request count", String(record.report.requests.length), y);
  y = field(doc, page, "Praja status", "PRAJA_ACKNOWLEDGED - copy stored", y);
  y = field(doc, page, "Government status", "NOT_SUBMITTED", y);

  doc.setFillColor(255, 248, 235);
  doc.roundedRect(LEFT, y + 4, RIGHT - LEFT, 34, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(95, 74, 32);
  doc.text("KEEP THIS NUMBER", LEFT + 6, y + 14);
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text(record.acknowledgementNumber, LEFT + 6, y + 23);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text("Use it on the Praja RTI home page to retrieve the saved application and PDFs.", LEFT + 6, y + 31);

  doc.setDrawColor(...RULE);
  doc.line(LEFT, 272, RIGHT, 272);
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("This acknowledgement was generated by Praja RTI, not by rtionline.gov.in or any public authority.", LEFT, 280);
  doc.text("No Government filing or payment has taken place.", LEFT, 286);
  return doc.output("blob");
}

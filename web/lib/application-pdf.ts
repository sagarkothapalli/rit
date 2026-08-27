import { jsPDF } from "jspdf";
import type { ApplicantDetails, StoredApplication } from "@/lib/application-records";
import type { ApplicationReport } from "@/lib/report";

interface ApplicationPdfInput {
  report: ApplicationReport;
  applicant: ApplicantDetails;
  acknowledgementNumber?: string;
}

const NAVY: [number, number, number] = [8, 47, 91];
const INK: [number, number, number] = [23, 32, 45];
const MUTED: [number, number, number] = [75, 89, 106];
const RULE: [number, number, number] = [185, 194, 207];

function safe(value: string | null | undefined): string {
  return (value ?? "Not stated").replace(/[\u2010-\u2015]/g, "-").replace(/\s+/g, " ").trim() || "Not stated";
}

function addFooter(doc: jsPDF, page: number): void {
  const height = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...RULE);
  doc.line(18, height - 16, 192, height - 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("Praja RTI application preview - not a Government filing or registration", 18, height - 10);
  doc.text(`Page ${page}`, 192, height - 10, { align: "right" });
}

function nextPage(doc: jsPDF, page: { value: number }): number {
  addFooter(doc, page.value);
  doc.addPage();
  page.value += 1;
  return 20;
}

function field(doc: jsPDF, label: string, value: string, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(label.toUpperCase(), 18, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);
  const lines = doc.splitTextToSize(safe(value), 122) as string[];
  doc.text(lines, 70, y);
  return y + Math.max(8, lines.length * 5.2);
}

export function createApplicationPdf(input: ApplicationPdfInput): Blob {
  const { report, applicant } = input;
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const page = { value: 1 };
  let y = 18;

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, 210, 34, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("RIGHT TO INFORMATION APPLICATION", 18, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Editable application preview prepared from the citizen's confirmed request", 18, 23);
  doc.text("RTI Act, 2005 - Section 6(1)", 192, 16, { align: "right" });
  y = 44;

  if (input.acknowledgementNumber) y = field(doc, "Praja acknowledgement", input.acknowledgementNumber, y);
  y = field(doc, "To", `The Central / State Public Information Officer, ${report.authority.name}`, y);
  y = field(doc, "Administrative body", report.authority.ministry, y);
  y = field(doc, "Subject", report.title, y + 2);

  doc.setDrawColor(...RULE);
  doc.line(18, y, 192, y);
  y += 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text("Applicant details", 18, y);
  y += 8;
  y = field(doc, "Name", applicant.name, y);
  y = field(doc, "Address", applicant.address, y);
  y = field(doc, "Email", applicant.email, y);
  y = field(doc, "Mobile", applicant.mobile || "Not provided", y);
  y = field(doc, "Citizenship", applicant.citizenship, y);
  y = field(doc, "Below poverty line", applicant.isBpl ? "Yes - supporting BPL certificate required" : "No", y);

  doc.line(18, y, 192, y);
  y += 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text("Information requested", 18, y);
  y += 8;

  report.requests.forEach((request, index) => {
    const lines = doc.splitTextToSize(`${index + 1}. ${safe(request)}`, 166) as string[];
    const needed = lines.length * 5.2 + 5;
    if (y + needed > 270) y = nextPage(doc, page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    doc.text(lines, 22, y);
    y += needed;
  });

  if (y + 44 > 270) y = nextPage(doc, page);
  doc.setDrawColor(...RULE);
  doc.line(18, y, 192, y);
  y += 9;
  y = field(doc, "Period", report.notes?.date_range ?? "Not stated", y);
  y = field(doc, "Place / project", report.notes?.place ?? "Not stated", y);
  y = field(doc, "Preferred format", report.notes?.format ?? "Certified copies", y);
  y = field(doc, "Fee preview", applicant.isBpl ? "Rs 0 (BPL)" : "Rs 10 (no payment processed)", y);

  if (y + 34 > 270) y = nextPage(doc, page);
  doc.setFillColor(247, 247, 244);
  doc.roundedRect(18, y, 174, 26, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text("DECLARATION", 23, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  const declaration = doc.splitTextToSize(
    "I confirm that the information above reflects my request. This PDF is a Praja RTI application preview and has not been transmitted to a Government system.",
    164,
  ) as string[];
  doc.text(declaration, 23, y + 14);
  addFooter(doc, page.value);
  return doc.output("blob");
}

export function createReceiptPdf(record: Omit<StoredApplication, "receiptPdfBase64" | "applicationPdfBase64">): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, 210, 42, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("PRAJA RTI ACKNOWLEDGEMENT", 18, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Local receipt - stored application copy", 18, 27);

  let y = 58;
  y = field(doc, "Acknowledgement no.", record.acknowledgementNumber, y);
  y = field(doc, "Created", new Date(record.createdAt).toLocaleString("en-IN"), y);
  y = field(doc, "Applicant", record.applicant.name, y);
  y = field(doc, "Application", record.report.title, y);
  y = field(doc, "Selected authority", record.report.authority.name, y);
  y = field(doc, "Request count", String(record.report.requests.length), y);
  y = field(doc, "Praja status", "PRAJA_ACKNOWLEDGED - copy stored", y);
  y = field(doc, "Government status", "NOT_SUBMITTED", y);

  doc.setFillColor(255, 248, 235);
  doc.roundedRect(18, y + 4, 174, 34, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(95, 74, 32);
  doc.text("KEEP THIS NUMBER", 24, y + 14);
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text(record.acknowledgementNumber, 24, y + 23);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text("Use it on the Praja RTI home page to retrieve the saved application and PDFs.", 24, y + 31);

  doc.setDrawColor(...RULE);
  doc.line(18, 272, 192, 272);
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("This acknowledgement was generated by Praja RTI, not by rtionline.gov.in or any public authority.", 18, 280);
  doc.text("No Government filing or payment has taken place.", 18, 286);
  return doc.output("blob");
}

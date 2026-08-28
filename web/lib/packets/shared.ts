import { jsPDF } from "jspdf";
import type { CaseRecord } from "@/lib/domain/case";
import type { FilingRuleSet } from "@/lib/filing-rules/schema";

const NAVY: [number, number, number] = [8, 47, 91];
const INK: [number, number, number] = [23, 32, 45];
const MUTED: [number, number, number] = [75, 89, 106];
const RULE: [number, number, number] = [185, 194, 207];

export const PDF = { LEFT: 18, RIGHT: 192, BOTTOM: 268, NAVY, INK, MUTED, RULE };

export function addFooter(doc: jsPDF, page: number, label: string): void {
  const height = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...RULE);
  doc.line(PDF.LEFT, height - 16, PDF.RIGHT, height - 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(`${label} — prepared with Praja RTI, not a Government filing`, PDF.LEFT, height - 10);
  doc.text(`Page ${page}`, PDF.RIGHT, height - 10, { align: "right" });
}

export function headingBand(doc: jsPDF, title: string, subtitle: string): void {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, 210, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, PDF.LEFT, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(subtitle, PDF.LEFT, 22);
  doc.text("Prepared with Praja RTI — not a Government filing", PDF.RIGHT, 22, { align: "right" });
}

export function paragraph(doc: jsPDF, text: string, y: number, page: { value: number }, label: string, indent = 0): number {
  const lines = doc.splitTextToSize(text, PDF.RIGHT - PDF.LEFT - indent) as string[];
  let top = y;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  for (const line of lines) {
    if (top + 5 > PDF.BOTTOM) {
      addFooter(doc, page.value, label);
      doc.addPage();
      page.value += 1;
      top = 20;
    }
    doc.text(line, PDF.LEFT + indent, top);
    top += 5;
  }
  return top;
}

export function field(doc: jsPDF, label: string, value: string, y: number, page: { value: number }, kind: string): number {
  const lines = doc.splitTextToSize(value || "Not stated", 122) as string[];
  const height = Math.max(7, lines.length * 5);
  let top = y;
  if (top + height > PDF.BOTTOM) {
    addFooter(doc, page.value, kind);
    doc.addPage();
    page.value += 1;
    top = 20;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(label.toUpperCase(), PDF.LEFT, top);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text(lines, PDF.LEFT + 52, top);
  return top + height + 1.5;
}

export function applicantFields(doc: jsPDF, record: CaseRecord, y: number, page: { value: number }, label: string): number {
  const person = record.applicant;
  let top = y;
  top = field(doc, "Applicant", person.name, top, page, label);
  top = field(doc, "Gender", person.gender, top, page, label);
  top = field(doc, "Address", [person.address, person.pincode, person.state].filter(Boolean).join(", "), top, page, label);
  top = field(doc, "Mobile", person.mobile, top, page, label);
  top = field(doc, "Email", person.email, top, page, label);
  return top;
}

export function createIndexPdf(
  record: CaseRecord,
  rules: FilingRuleSet,
  packed: Array<{ name: string; kind: string; byteSize: number }> = [],
): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const page = { value: 1 };
  headingBand(doc, "DOCUMENT INDEX", record.prajaReference);
  let y = 42;
  y = field(doc, "Case", record.title, y, page, "Document index");
  y = field(doc, "Type", record.caseType, y, page, "Document index");
  y = field(doc, "Authority", record.authorityName, y, page, "Document index");
  y = field(doc, "Rule set", `${rules.id} · verified ${rules.verifiedAt}`, y, page, "Document index");
  y = field(doc, "Source", rules.sourceUrl, y, page, "Document index");
  y += 6;
  const listed = packed.length
    ? packed
    : record.attachments
        .filter((item) => !item.deletedAt)
        .map((item) => ({ name: item.storedName, kind: item.kind, byteSize: item.byteSize }));
  listed.forEach((item, index) => {
    y = paragraph(
      doc,
      `${index + 1}. ${item.name} — ${item.kind.replaceAll("_", " ").toLowerCase()} (${Math.ceil(item.byteSize / 1024)} KB)`,
      y,
      page,
      "Document index",
    );
    y += 2;
  });
  y += 8;
  y = paragraph(
    doc,
    "This index is part of a Praja RTI filing packet. It is not an official acknowledgement, and no document listed here has been filed with a government system by this workspace.",
    y,
    page,
    "Document index",
  );
  addFooter(doc, page.value, "Document index");
  return doc.output("blob");
}

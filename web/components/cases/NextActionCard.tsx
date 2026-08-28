import Link from "next/link";
import type { CaseRecord } from "@/lib/domain/case";
import { nextActionLabel } from "@/lib/domain/case";
import { isOfficiallyFiled } from "@/lib/domain/status";
import { casePath } from "@/lib/storage/paths";

export default function NextActionCard({ record }: { record: CaseRecord }) {
  const label = nextActionLabel(record);
  const links: Array<{ href: string; text: string }> = [];
  if (record.preparationStatus !== "PACKET_GENERATED") {
    links.push({ href: casePath(record.id, "edit"), text: "Continue drafting" });
  }
  if (record.preparationStatus === "PACKET_GENERATED" && !isOfficiallyFiled(record.filingStatus)) {
    links.push({ href: casePath(record.id, "filing"), text: "Open filing handoff" });
    links.push({ href: casePath(record.id, "record-filing"), text: "Record official filing" });
  }
  if (record.caseType === "RTI_REQUEST" && isOfficiallyFiled(record.filingStatus)) {
    links.push({ href: casePath(record.id, "first-appeal"), text: "Start first appeal" });
    links.push({ href: casePath(record.id, "complaint"), text: "Section 18 complaint" });
  }
  if (record.caseType === "FIRST_APPEAL" && isOfficiallyFiled(record.filingStatus)) {
    links.push({ href: casePath(record.id, "second-appeal"), text: "Start second appeal" });
  }
  links.push({ href: casePath(record.id, "events/new"), text: "Record a reply or transfer" });
  return (
    <aside className="progress-card">
      <div className="progress-head">
        <span className="progress-step">Next</span>
        <strong>{label ?? "Review this case"}</strong>
      </div>
      <div className="next-action-links">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="text-link">
            {link.text}
          </Link>
        ))}
      </div>
    </aside>
  );
}

import type { CaseRecord } from "@/lib/domain/case";
import { CASE_TYPE_LABEL } from "@/lib/domain/status";
import CaseStatusStrip from "./CaseStatusStrip";
import FilingSourceBadge from "./FilingSourceBadge";

export default function CaseHeader({ record }: { record: CaseRecord }) {
  const primary = record.officialReferences.find((item) => item.isPrimary) ?? record.officialReferences[0];
  return (
    <header className="case-header">
      <p className="progress-step">{CASE_TYPE_LABEL[record.caseType]}</p>
      <h1>{record.title}</h1>
      <p className="step-lede">
        Praja reference <strong>{record.prajaReference}</strong>
        {primary ? ` · Official no. ${primary.registrationNumber}` : ""}
      </p>
      <CaseStatusStrip record={record} />
      {primary && (
        <p className="case-source">
          Official reference: <FilingSourceBadge source={primary.source} />
        </p>
      )}
    </header>
  );
}

import {
  FILING_LABEL,
  OUTCOME_LABEL,
  PREPARATION_LABEL,
  type FilingStatus,
  type OutcomeStatus,
  type PreparationStatus,
} from "@/lib/domain/status";

export default function CaseStatusStrip({
  preparation,
  filing,
  outcome,
}: {
  preparation: PreparationStatus;
  filing: FilingStatus;
  outcome: OutcomeStatus;
}) {
  return (
    <dl className="case-status-strip">
      <div>
        <dt>Preparation</dt>
        <dd>{PREPARATION_LABEL[preparation]}</dd>
      </div>
      <div>
        <dt>Filing</dt>
        <dd>{FILING_LABEL[filing]}</dd>
      </div>
      <div>
        <dt>Outcome</dt>
        <dd>{OUTCOME_LABEL[outcome]}</dd>
      </div>
    </dl>
  );
}

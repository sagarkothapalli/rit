"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import WorkspaceShell from "@/components/cases/WorkspaceShell";
import DelayExplanationForm from "./DelayExplanationForm";
import VoiceNote from "./VoiceNote";
import type { CaseRecord, SecondAppealDraftPayload } from "@/lib/domain/case";
import { secondAppealWindow } from "@/lib/deadlines/calculate";
import { filingRulesFor } from "@/lib/filing-rules/registry";
import { fetchCase, saveCase } from "@/lib/storage/cases.client";
import { createBlankCase, emptySecondAppealDraft } from "@/lib/storage/factory";
import { verifiedEmail } from "@/lib/application-records";

export default function SecondAppealWizard({ parentId }: { parentId: string }) {
  const router = useRouter();
  const [parent, setParent] = useState<CaseRecord | null>(null);
  const [draft, setDraft] = useState<SecondAppealDraftPayload>(emptySecondAppealDraft());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchCase(parentId).then((record) => {
      if (!active || !record) return;
      setParent(record);
      setDraft((current) => ({
        ...current,
        destination: record.jurisdiction === "STATE" ? "SIC" : "CIC",
        noFaaDecision: record.outcomeStatus === "AWAITING_RESPONSE",
      }));
    });
    return () => {
      active = false;
    };
  }, [parentId]);

  const rules = filingRulesFor({
    caseType: "SECOND_APPEAL",
    jurisdiction: parent?.jurisdiction ?? "CENTRAL",
  });
  const faaFiled = parent?.officialReferences.find((item) => item.referenceKind === "FIRST_APPEAL")?.filedAt
    ?? parent?.officialReferences[0]?.filedAt
    ?? "";
  const window = useMemo(() => {
    if (!faaFiled) return null;
    return secondAppealWindow({
      faaFiledAt: faaFiled,
      faaDecisionAt: draft.noFaaDecision ? null : draft.faaOrderDate,
      faaDecisionReceivedAt: draft.faaOrderReceivedAt,
      rule: rules,
    });
  }, [faaFiled, draft.noFaaDecision, draft.faaOrderDate, draft.faaOrderReceivedAt, rules]);

  async function submit() {
    if (!draft.prayer.trim() || !draft.grounds.trim()) {
      setError("Write the grounds and the specific prayer.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const email = (await verifiedEmail()) ?? parent?.ownerEmail ?? "unverified@local";
      const child = await createBlankCase({
        caseType: "SECOND_APPEAL",
        ownerEmail: email,
        parentCaseId: parent?.id ?? parentId,
        jurisdiction: parent?.jurisdiction ?? "CENTRAL",
        authorityName: parent?.authorityName ?? "Not selected",
        title: `Second appeal — ${parent?.title ?? "reconstructed case"}`,
      });
      child.draft.payload = draft;
      child.applicant = parent?.applicant ?? child.applicant;
      child.preparationStatus = "READY_FOR_REVIEW";
      child.filingChannel = rules.filingChannel;
      await saveCase(child);
      router.push(`/cases/${child.id}/filing`);
    } catch {
      setError("The second appeal could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <WorkspaceShell>
      <article className="workspace-panel">
        <div className="step-body">
          <h1>Second appeal.</h1>
          <p className="step-lede">
            Section 19(3). Central matters go to the CIC; State matters go to the applicable SIC. Praja does not file this.
          </p>
          <p className="step-hint">
            Destination: {draft.destination || (parent?.jurisdiction === "STATE" ? "SIC" : "CIC")}. Rule verified {rules.verifiedAt}.
          </p>
          <label className="applicant-check">
            <input
              type="checkbox"
              checked={draft.noFaaDecision}
              onChange={(event) => setDraft({ ...draft, noFaaDecision: event.target.checked })}
            />
            <span>The First Appellate Authority has not decided.</span>
          </label>
          {!draft.noFaaDecision && (
            <div className="applicant-row">
              <label className="applicant-field">
                <span className="applicant-label">FAA order date</span>
                <input type="date" value={draft.faaOrderDate ?? ""} onChange={(event) => setDraft({ ...draft, faaOrderDate: event.target.value })} />
              </label>
              <label className="applicant-field">
                <span className="applicant-label">Date you received it</span>
                <input type="date" value={draft.faaOrderReceivedAt ?? ""} onChange={(event) => setDraft({ ...draft, faaOrderReceivedAt: event.target.value })} />
              </label>
            </div>
          )}
          {window && <p className={window.eligible ? "step-hint" : "step-error"}>{window.explanation}</p>}
          <VoiceNote label="Background" value={draft.background} onChange={(background) => setDraft({ ...draft, background })} />
          <VoiceNote label="Information sought" value={draft.informationSought} onChange={(informationSought) => setDraft({ ...draft, informationSought })} />
          <VoiceNote label="Information not provided" value={draft.informationNotProvided} onChange={(informationNotProvided) => setDraft({ ...draft, informationNotProvided })} />
          <VoiceNote label="Reasons for dissatisfaction" value={draft.reasonsForDissatisfaction} onChange={(reasonsForDissatisfaction) => setDraft({ ...draft, reasonsForDissatisfaction })} />
          <VoiceNote label="Specific second-appeal grounds" value={draft.grounds} onChange={(grounds) => setDraft({ ...draft, grounds })} />
          <VoiceNote label="Specific prayer / relief" value={draft.prayer} onChange={(prayer) => setDraft({ ...draft, prayer })} />
          <VoiceNote label="Compensation grounds, if sought" value={draft.compensationGrounds} onChange={(compensationGrounds) => setDraft({ ...draft, compensationGrounds })} />
          <DelayExplanationForm
            value={draft.delayExplanation}
            onChange={(delayExplanation) => setDraft({ ...draft, delayExplanation })}
            needed={Boolean(window && !window.eligible)}
          />
          <label className="applicant-check">
            <input
              type="checkbox"
              checked={draft.furnishedCopyToAuthority}
              onChange={(event) => setDraft({ ...draft, furnishedCopyToAuthority: event.target.checked })}
            />
            <span>I will furnish a copy of this appeal to the public authority.</span>
          </label>
          {error && <p className="step-error" role="alert">{error}</p>}
          <div className="step-actions">
            <button type="button" className="primary-button" onClick={() => void submit()} disabled={busy}>
              {busy ? "Preparing…" : "Prepare the Commission packet"}
            </button>
            <Link className="ghost-button" href={`/cases/${parentId}`}>Back</Link>
          </div>
        </div>
      </article>
    </WorkspaceShell>
  );
}

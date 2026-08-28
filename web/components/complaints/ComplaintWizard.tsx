"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import WorkspaceShell from "@/components/cases/WorkspaceShell";
import VoiceNote from "@/components/appeals/VoiceNote";
import ComplaintGroundsForm from "./ComplaintGroundsForm";
import ComplaintEligibilityReview from "./ComplaintEligibilityReview";
import type { CaseRecord, ComplaintDraftPayload } from "@/lib/domain/case";
import { filingRulesFor } from "@/lib/filing-rules/registry";
import { fetchCase, saveCase } from "@/lib/storage/cases.client";
import { createBlankCase, emptyComplaintDraft } from "@/lib/storage/factory";
import { verifiedEmail } from "@/lib/application-records";

export default function ComplaintWizard({ parentId }: { parentId?: string }) {
  const router = useRouter();
  const [parent, setParent] = useState<CaseRecord | null>(null);
  const [draft, setDraft] = useState<ComplaintDraftPayload>(() => ({
    ...emptyComplaintDraft(),
    relatedRtiExists: Boolean(parentId),
  }));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!parentId) return;
    let active = true;
    void fetchCase(parentId).then((record) => {
      if (!active || !record) return;
      setParent(record);
      setDraft((current) => ({ ...current, relatedRtiExists: true }));
    });
    return () => {
      active = false;
    };
  }, [parentId]);

  const rules = filingRulesFor({
    caseType: "SECTION_18_COMPLAINT",
    jurisdiction: parent?.jurisdiction ?? "UNCLEAR",
  });
  const appealLike = draft.ground === "REFUSED_ACCESS" || draft.ground === "NO_RESPONSE" || draft.ground === "INCOMPLETE_MISLEADING_FALSE";

  async function submit() {
    if (!draft.ground) {
      setError("Select the specific Section 18 ground.");
      return;
    }
    if (draft.ground === "UNABLE_TO_SUBMIT" && !draft.unableToSubmitReason.trim()) {
      setError("Explain why the request could not be submitted.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const email = (await verifiedEmail()) ?? parent?.ownerEmail ?? "unverified@local";
      const child = await createBlankCase({
        caseType: "SECTION_18_COMPLAINT",
        ownerEmail: email,
        parentCaseId: parent?.id ?? null,
        jurisdiction: parent?.jurisdiction ?? "UNCLEAR",
        authorityName: parent?.authorityName ?? "Not selected",
        title: `Section 18 complaint — ${parent?.title ?? "standalone"}`,
      });
      child.draft.payload = draft;
      child.applicant = parent?.applicant ?? child.applicant;
      child.preparationStatus = "READY_FOR_REVIEW";
      child.filingChannel = rules.filingChannel;
      await saveCase(child);
      router.push(`/cases/${child.id}/filing`);
    } catch {
      setError("The complaint could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <WorkspaceShell>
      <article className="workspace-panel">
        <div className="step-body">
          <h1>Section 18 complaint.</h1>
          <p className="step-lede">
            This is a complaint to the Commission, not the original grievance and not an appeal. Central matters go
            to the CIC; State matters go to the applicable SIC.
          </p>
          <ComplaintEligibilityReview relatedRtiExists={draft.relatedRtiExists} groundIsAppealLike={appealLike} />
          <ComplaintGroundsForm value={draft.ground} onChange={(ground) => setDraft({ ...draft, ground })} />
          {draft.ground === "UNABLE_TO_SUBMIT" && (
            <VoiceNote
              label="Why the request could not be submitted"
              value={draft.unableToSubmitReason}
              onChange={(unableToSubmitReason) => setDraft({ ...draft, unableToSubmitReason, relatedRtiExists: false })}
            />
          )}
          <VoiceNote label="Facts" value={draft.facts} onChange={(facts) => setDraft({ ...draft, facts })} />
          <VoiceNote label="Relief sought" value={draft.relief} onChange={(relief) => setDraft({ ...draft, relief })} />
          <VoiceNote
            label="Life or liberty, if claimed"
            value={draft.lifeOrLibertyExplanation}
            onChange={(lifeOrLibertyExplanation) => setDraft({ ...draft, lifeOrLibertyExplanation })}
          />
          <VoiceNote
            label="If the body denies being a public authority, why it is one"
            value={draft.publicAuthorityJustification}
            onChange={(publicAuthorityJustification) => setDraft({ ...draft, publicAuthorityJustification })}
          />
          <label className="applicant-check">
            <input
              type="checkbox"
              checked={draft.furnishedCopyToAuthority}
              onChange={(event) => setDraft({ ...draft, furnishedCopyToAuthority: event.target.checked })}
            />
            <span>I will furnish a copy to the public authority where that is required.</span>
          </label>
          <p className="applicant-hint">
            {rules.destinationLabel}. Rule verified {rules.verifiedAt}. This workspace does not promise that the
            Commission will register or convert the matter in a particular way.
          </p>
          {error && <p className="step-error" role="alert">{error}</p>}
          <div className="step-actions">
            <button type="button" className="primary-button" onClick={() => void submit()} disabled={busy}>
              {busy ? "Preparing…" : "Prepare the complaint packet"}
            </button>
            <Link className="ghost-button" href={parentId ? `/cases/${parentId}` : "/cases"}>
              Back
            </Link>
          </div>
        </div>
      </article>
    </WorkspaceShell>
  );
}

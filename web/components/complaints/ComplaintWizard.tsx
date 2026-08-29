"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import WorkspaceShell from "@/components/cases/WorkspaceShell";
import ApplicantForm from "@/components/ApplicantForm";
import VoiceNote from "@/components/appeals/VoiceNote";
import ComplaintGroundsForm from "./ComplaintGroundsForm";
import ComplaintEligibilityReview from "./ComplaintEligibilityReview";
import type { CaseRecord, ComplaintDraftPayload, Jurisdiction } from "@/lib/domain/case";
import { filingRulesFor } from "@/lib/filing-rules/registry";
import { copyAttachments, fetchCase, saveCase } from "@/lib/storage/cases.client";
import { createBlankCase, emptyComplaintDraft, hydrateCase } from "@/lib/storage/factory";
import { verifiedEmail } from "@/lib/application-records";
import { complaintErrors } from "@/lib/appeals/validate";
import { casePath } from "@/lib/storage/paths";
import { emptyApplicant, validateApplicant, type ApplicantDetails, type FieldProblem } from "@/lib/applicant";
import DraftResumePrompt from "@/components/request/DraftResumePrompt";
import {
  clearSection18Draft,
  clearAllDraftAndIntakeCache,
  hasSubstantialSection18Draft,
  loadSection18Draft,
  saveSection18Draft,
  type Section18DraftSnapshot,
} from "@/lib/draft/draftMemory";

export default function ComplaintWizard({
  parentId,
  editCaseId,
}: {
  parentId?: string;
  editCaseId?: string;
}) {
  const router = useRouter();
  const [parent, setParent] = useState<CaseRecord | null>(null);
  const [editing, setEditing] = useState<CaseRecord | null>(null);
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>("UNCLEAR");
  const [draft, setDraft] = useState<ComplaintDraftPayload>(() => ({
    ...emptyComplaintDraft(),
    relatedRtiExists: Boolean(parentId),
  }));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [applicant, setApplicant] = useState<ApplicantDetails>(emptyApplicant());
  const [problems, setProblems] = useState<FieldProblem[]>([]);
  const [pendingPrompt, setPendingPrompt] = useState<Section18DraftSnapshot | null>(() => {
    if (typeof window === "undefined" || editCaseId || parentId) return null;
    const saved = loadSection18Draft();
    return hasSubstantialSection18Draft(saved) ? saved : null;
  });

  useEffect(() => {
    // Strip redirect or state query parameters on mount
    if (typeof window !== "undefined" && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      if (params.has("token") || params.has("redirect") || params.has("draftId") || params.has("code")) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    }

    if (editCaseId) {
      void fetchCase(editCaseId).then((record) => {
        if (!record) return;
        setEditing(record);
        setApplicant(record.applicant);
        setJurisdiction(record.jurisdiction);
        if (record.draft.payload.kind === "SECTION_18_COMPLAINT") setDraft(record.draft.payload);
      });
      return;
    }
    if (parentId) {
      let active = true;
      void fetchCase(parentId).then((record) => {
        if (!active || !record) return;
        setParent(record);
        setApplicant(record.applicant);
        setJurisdiction(record.jurisdiction);
        setDraft((current) => ({
          ...current,
          relatedRtiExists: true,
          relatedRegistrationNumber: record.officialReferences[0]?.registrationNumber ?? "",
          destination: record.jurisdiction === "STATE" ? "SIC" : record.jurisdiction === "CENTRAL" ? "CIC" : "",
        }));
      });
      return () => {
        active = false;
      };
    }
  }, [parentId, editCaseId]);

  // Auto-save Section 18 draft
  useEffect(() => {
    if (editCaseId || parentId || pendingPrompt) return;
    const currentSnapshot: Section18DraftSnapshot = {
      draft,
      jurisdiction,
      applicant,
      capturedAt: Date.now(),
    };
    if (hasSubstantialSection18Draft(currentSnapshot)) {
      saveSection18Draft({ draft, jurisdiction, applicant });
    }
  }, [draft, jurisdiction, applicant, editCaseId, parentId, pendingPrompt]);

  function handleContinueDraft() {
    if (!pendingPrompt) return;
    setDraft(pendingPrompt.draft);
    setJurisdiction(pendingPrompt.jurisdiction);
    setApplicant(pendingPrompt.applicant);
    setPendingPrompt(null);
  }

  function handleStartFresh() {
    clearSection18Draft();
    clearAllDraftAndIntakeCache();
    setDraft(emptyComplaintDraft());
    setJurisdiction("UNCLEAR");
    setApplicant(emptyApplicant());
    setPendingPrompt(null);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }

  const rules = filingRulesFor({
    caseType: "SECTION_18_COMPLAINT",
    jurisdiction,
  });
  const appealLike = draft.ground === "REFUSED_ACCESS" || draft.ground === "NO_RESPONSE" || draft.ground === "INCOMPLETE_MISLEADING_FALSE";

  async function submit() {
    if (!parent) setProblems(validateApplicant(applicant));
    const errors = complaintErrors(draft, jurisdiction, { requireApplicant: !parent, record: editing ?? undefined });
    if (errors.length) {
      setError(errors[0]);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let child = hydrateCase(
        editing ??
          (await createBlankCase({
            caseType: "SECTION_18_COMPLAINT",
            ownerEmail: (await verifiedEmail()) ?? parent?.ownerEmail ?? applicant.email,
            parentCaseId: parent?.id ?? null,
            jurisdiction,
            authorityName: parent?.authorityName ?? "Not selected",
            title: `Section 18 complaint — ${parent?.title ?? "standalone"}`,
          })),
      );
      child.draft.payload = { ...draft, destination: jurisdiction === "STATE" ? "SIC" : jurisdiction === "CENTRAL" ? "CIC" : "" };
      child.draft.version = editCaseId ? child.draft.version + 1 : child.draft.version;
      child.draftVersion = child.draft.version;
      child.applicant = parent?.applicant ?? { ...applicant, ownerEmail: applicant.email };
      child.preparationStatus = "READY_FOR_REVIEW";
      child.filingChannel = rules.filingChannel;
      child.jurisdiction = jurisdiction;
      if (parent && !editCaseId) {
        child = await copyAttachments(parent, child, ["APPLICATION_PDF", "CPIO_REPLY", "FAA_ORDER", "SUPPORTING"]);
      }
      await saveCase(child);
      clearSection18Draft();
      router.push(casePath(child.id, "filing"));
    } catch {
      setError("The complaint could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <WorkspaceShell>
      {pendingPrompt && (
        <DraftResumePrompt
          isSection18
          title="In-progress Section 18 complaint found"
          subtitle="You have an unfiled Section 18 complaint draft. Would you like to continue where you left off or start fresh?"
          snippet={pendingPrompt.draft.facts || pendingPrompt.draft.relief || `Ground: ${pendingPrompt.draft.ground}`}
          stepLabel="Section 18 Complaint Draft"
          capturedAt={pendingPrompt.capturedAt}
          onContinue={handleContinueDraft}
          onStartFresh={handleStartFresh}
        />
      )}
      <article className="workspace-panel">
        <div className="step-body">
          <h1>{editCaseId ? "Edit Section 18 complaint." : "Section 18 complaint."}</h1>
          <p className="step-lede">
            This is a complaint to the Commission, not the original grievance and not an appeal. Central matters go
            to the CIC; State matters go to the applicable SIC.
          </p>
          <label className="applicant-field">
            <span className="applicant-label">Jurisdiction<em> *</em></span>
            <select value={jurisdiction} onChange={(event) => setJurisdiction(event.target.value as Jurisdiction)}>
              <option value="UNCLEAR">Not yet classified</option>
              <option value="CENTRAL">Central public authority — CIC</option>
              <option value="STATE">State or local body — SIC</option>
            </select>
          </label>
          {jurisdiction === "UNCLEAR" && (
            <p className="step-error">A standalone complaint is not addressed to the CIC until Central jurisdiction is confirmed.</p>
          )}
          <ComplaintEligibilityReview relatedRtiExists={draft.relatedRtiExists} groundIsAppealLike={appealLike} />
          <ComplaintGroundsForm value={draft.ground} onChange={(ground) => setDraft({ ...draft, ground })} />
          {draft.ground === "UNABLE_TO_SUBMIT" && (
            <VoiceNote
              label="Why the request could not be submitted"
              value={draft.unableToSubmitReason}
              lang={parent?.language ?? "en-IN"}
              onChange={(unableToSubmitReason) => setDraft({ ...draft, unableToSubmitReason, relatedRtiExists: false })}
            />
          )}
          {draft.relatedRtiExists && (
            <label className="applicant-field">
              <span className="applicant-label">Related RTI registration number</span>
              <input
                value={draft.relatedRegistrationNumber}
                onChange={(event) => setDraft({ ...draft, relatedRegistrationNumber: event.target.value })}
              />
            </label>
          )}
          <VoiceNote label="Facts" value={draft.facts} lang={parent?.language ?? "en-IN"} guided onChange={(facts) => setDraft({ ...draft, facts })} />
          <VoiceNote label="Relief sought" value={draft.relief} lang={parent?.language ?? "en-IN"} onChange={(relief) => setDraft({ ...draft, relief })} />
          <VoiceNote label="Chronology" value={draft.chronology} lang={parent?.language ?? "en-IN"} onChange={(chronology) => setDraft({ ...draft, chronology })} />
          <VoiceNote
            label="Life or liberty, if claimed"
            value={draft.lifeOrLibertyExplanation}
            lang={parent?.language ?? "en-IN"}
            onChange={(lifeOrLibertyExplanation) => setDraft({ ...draft, lifeOrLibertyExplanation })}
          />
          <VoiceNote
            label="If the body denies being a public authority, why it is one"
            value={draft.publicAuthorityJustification}
            lang={parent?.language ?? "en-IN"}
            onChange={(publicAuthorityJustification) => setDraft({ ...draft, publicAuthorityJustification })}
          />
          <label className="applicant-field">
            <span className="applicant-label">PIO name</span>
            <input value={draft.pioName} onChange={(event) => setDraft({ ...draft, pioName: event.target.value })} />
          </label>
          <label className="applicant-check">
            <input
              type="checkbox"
              checked={draft.furnishedCopyToAuthority}
              onChange={(event) => setDraft({ ...draft, furnishedCopyToAuthority: event.target.checked })}
            />
            <span>I will furnish a copy to the public authority where that is required.</span>
          </label>
          {!parent && <ApplicantForm value={applicant} onChange={setApplicant} problems={problems} />}
          <p className="applicant-hint">
            {jurisdiction === "UNCLEAR" ? "Confirm the Commission before you file." : rules.destinationLabel}. Rule verified {rules.verifiedAt}.
          </p>
          {error && <p className="step-error" role="alert">{error}</p>}
          <div className="step-actions">
            <button type="button" className="primary-button" onClick={() => void submit()} disabled={busy}>
              {busy ? "Preparing…" : "Prepare the complaint packet"}
            </button>
            <Link className="ghost-button" href={parentId ? casePath(parentId) : "/cases"}>
              Back
            </Link>
          </div>
        </div>
      </article>
    </WorkspaceShell>
  );
}

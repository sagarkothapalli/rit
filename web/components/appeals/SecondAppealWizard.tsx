"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import WorkspaceShell from "@/components/cases/WorkspaceShell";
import ApplicantForm from "@/components/ApplicantForm";
import AttachmentUploader from "@/components/attachments/AttachmentUploader";
import DelayExplanationForm from "./DelayExplanationForm";
import VoiceNote from "./VoiceNote";
import type { CaseRecord, SecondAppealDraftPayload } from "@/lib/domain/case";
import { secondAppealWindow } from "@/lib/deadlines/calculate";
import { filingRulesFor } from "@/lib/filing-rules/registry";
import { copyAttachments, fetchCase, listCasesLocal, saveCase } from "@/lib/storage/cases.client";
import { createBlankCase, emptySecondAppealDraft, hydrateCase } from "@/lib/storage/factory";
import { verifiedEmail } from "@/lib/application-records";
import { secondAppealErrors } from "@/lib/appeals/validate";
import { casePath } from "@/lib/storage/paths";
import { emptyApplicant, validateApplicant, type ApplicantDetails, type FieldProblem } from "@/lib/applicant";
import type { ExtractedAppealFacts } from "@/lib/appeals/extract";

export default function SecondAppealWizard({
  parentId,
  editCaseId,
}: {
  parentId?: string;
  editCaseId?: string;
}) {
  const router = useRouter();
  const [parent, setParent] = useState<CaseRecord | null>(null);
  const [parents, setParents] = useState<CaseRecord[]>([]);
  const [editing, setEditing] = useState<CaseRecord | null>(null);
  const [draft, setDraft] = useState<SecondAppealDraftPayload>(emptySecondAppealDraft());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [applicant, setApplicant] = useState<ApplicantDetails>(emptyApplicant());
  const [problems, setProblems] = useState<FieldProblem[]>([]);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (editCaseId) {
        const record = await fetchCase(editCaseId);
        if (!active || !record) return;
        setEditing(record);
        setApplicant(record.applicant);
        if (record.draft.payload.kind === "SECOND_APPEAL") setDraft(record.draft.payload);
        if (record.parentCaseId) setParent(await fetchCase(record.parentCaseId));
        return;
      }
      if (parentId) {
        const record = await fetchCase(parentId);
        if (!active || !record) return;
        setParent(record);
        setApplicant(record.applicant);
        const faa = record.officialReferences.find((item) => item.referenceKind === "FIRST_APPEAL") ?? record.officialReferences[0];
        const original = record.draft.payload.kind === "FIRST_APPEAL" ? record.draft.payload.originalRegistrationNumber : "";
        setDraft((current) => ({
          ...current,
          destination: record.jurisdiction === "STATE" ? "SIC" : record.jurisdiction === "CENTRAL" ? "CIC" : "",
          noFaaDecision: record.outcomeStatus === "AWAITING_RESPONSE",
          firstAppealRegistrationNumber: faa?.registrationNumber ?? "",
          firstAppealFiledAt: faa?.filedAt ?? null,
          originalRegistrationNumber: original,
        }));
        return;
      }
      const summaries = await listCasesLocal();
      const loaded: CaseRecord[] = [];
      for (const item of summaries.filter((row) => row.caseType === "FIRST_APPEAL" || row.caseType === "RTI_REQUEST")) {
        const record = await fetchCase(item.id);
        if (record) loaded.push(record);
      }
      if (active) setParents(loaded);
    })();
    return () => {
      active = false;
    };
  }, [parentId, editCaseId]);

  const jurisdiction = parent?.jurisdiction ?? editing?.jurisdiction ?? (draft.destination === "SIC" ? "STATE" : draft.destination === "CIC" ? "CENTRAL" : "UNCLEAR");
  const rules = filingRulesFor({ caseType: "SECOND_APPEAL", jurisdiction });
  const faaFiled =
    draft.firstAppealFiledAt ||
    parent?.officialReferences.find((item) => item.referenceKind === "FIRST_APPEAL")?.filedAt ||
    parent?.officialReferences[0]?.filedAt ||
    "";
  const window = useMemo(() => {
    if (!faaFiled) return null;
    return secondAppealWindow({
      faaFiledAt: faaFiled,
      faaDecisionAt: draft.noFaaDecision ? null : draft.faaOrderDate,
      faaDecisionReceivedAt: draft.faaOrderReceivedAt,
      rule: rules,
    });
  }, [faaFiled, draft.noFaaDecision, draft.faaOrderDate, draft.faaOrderReceivedAt, rules]);

  function applyExtracted(facts: ExtractedAppealFacts) {
    setDraft((current) => ({
      ...current,
      originalRegistrationNumber: current.originalRegistrationNumber || facts.registrationNumbers[0] || "",
      firstAppealRegistrationNumber: current.firstAppealRegistrationNumber || facts.registrationNumbers[1] || current.firstAppealRegistrationNumber,
      background: current.background || facts.background,
      grounds: current.grounds || facts.grounds,
      chronology: current.chronology || facts.dates.map((day) => `${day}: as stated`).join("\n"),
    }));
  }

  async function submit() {
    const late = Boolean(window && !window.eligible);
    if (!parent) {
      setProblems(validateApplicant(applicant));
    }
    const errors = secondAppealErrors(draft, {
      late,
      requireApplicant: !parent,
      record: editing ?? undefined,
    });
    if (!draft.destination) errors.unshift("Confirm CIC or SIC before preparing the packet.");
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
            caseType: "SECOND_APPEAL",
            ownerEmail: (await verifiedEmail()) ?? parent?.ownerEmail ?? applicant.email,
            parentCaseId: parent?.id ?? null,
            jurisdiction,
            authorityName: parent?.authorityName ?? "Not selected",
            title: `Second appeal — ${parent?.title ?? draft.originalRegistrationNumber}`,
          })),
      );
      child.draft.payload = draft;
      child.draft.version = editCaseId ? child.draft.version + 1 : child.draft.version;
      child.draftVersion = child.draft.version;
      child.applicant = parent?.applicant ?? { ...applicant, ownerEmail: applicant.email };
      child.preparationStatus = "READY_FOR_REVIEW";
      child.filingChannel = rules.filingChannel;
      child.jurisdiction = jurisdiction;
      if (parent && !editCaseId) {
        child = await copyAttachments(parent, child, ["APPLICATION_PDF", "FIRST_APPEAL", "FAA_ORDER", "CPIO_REPLY", "SUPPORTING"]);
      }
      await saveCase(child);
      router.push(casePath(child.id, "filing"));
    } catch {
      setError("The second appeal could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  const reconstruct = !parent && !editCaseId;

  return (
    <WorkspaceShell>
      <article className="workspace-panel">
        <div className="step-body">
          <h1>{editCaseId ? "Edit second appeal." : "Second appeal."}</h1>
          <p className="step-lede">
            Section 19(3). Central matters go to the CIC; State matters go to the applicable SIC. Praja does not file this.
          </p>
          {reconstruct && (
            <label className="applicant-field">
              <span className="applicant-label">Related first appeal or request</span>
              <select
                value=""
                onChange={(event) => {
                  const found = parents.find((item) => item.id === event.target.value);
                  if (found) setParent(found);
                }}
              >
                <option value="">I filed the first appeal elsewhere — reconstruct it here</option>
                {parents.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.prajaReference} — {item.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="applicant-field">
            <span className="applicant-label">Commission<em> *</em></span>
            <select
              value={draft.destination}
              onChange={(event) => setDraft({ ...draft, destination: event.target.value as SecondAppealDraftPayload["destination"] })}
            >
              <option value="">Confirm before filing</option>
              <option value="CIC">Central Information Commission</option>
              <option value="SIC">State Information Commission</option>
            </select>
          </label>
          <div className="applicant-row">
            <label className="applicant-field">
              <span className="applicant-label">Original RTI registration no.<em> *</em></span>
              <input
                value={draft.originalRegistrationNumber}
                onChange={(event) => setDraft({ ...draft, originalRegistrationNumber: event.target.value })}
              />
            </label>
            <label className="applicant-field">
              <span className="applicant-label">First-appeal registration no.<em> *</em></span>
              <input
                value={draft.firstAppealRegistrationNumber}
                onChange={(event) => setDraft({ ...draft, firstAppealRegistrationNumber: event.target.value })}
              />
            </label>
          </div>
          <label className="applicant-field">
            <span className="applicant-label">First appeal filed on</span>
            <input
              type="date"
              value={draft.firstAppealFiledAt ?? ""}
              onChange={(event) => setDraft({ ...draft, firstAppealFiledAt: event.target.value })}
            />
          </label>
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
                <span className="applicant-label">FAA order date<em> *</em></span>
                <input type="date" value={draft.faaOrderDate ?? ""} onChange={(event) => setDraft({ ...draft, faaOrderDate: event.target.value })} />
              </label>
              <label className="applicant-field">
                <span className="applicant-label">Date you received it</span>
                <input type="date" value={draft.faaOrderReceivedAt ?? ""} onChange={(event) => setDraft({ ...draft, faaOrderReceivedAt: event.target.value })} />
              </label>
            </div>
          )}
          {window && <p className={window.eligible ? "step-hint" : "step-error"}>{window.explanation}</p>}
          <div className="applicant-row">
            <label className="applicant-field">
              <span className="applicant-label">CPIO / SPIO</span>
              <input value={draft.pioName} onChange={(event) => setDraft({ ...draft, pioName: event.target.value })} />
            </label>
            <label className="applicant-field">
              <span className="applicant-label">FAA</span>
              <input value={draft.faaName} onChange={(event) => setDraft({ ...draft, faaName: event.target.value })} />
            </label>
          </div>
          <VoiceNote
            label="What happened"
            value={draft.background}
            lang={parent?.language ?? "en-IN"}
            guided
            onExtracted={applyExtracted}
            onChange={(background) => setDraft({ ...draft, background })}
          />
          <VoiceNote label="Information sought" value={draft.informationSought} lang={parent?.language ?? "en-IN"} onChange={(informationSought) => setDraft({ ...draft, informationSought })} />
          <VoiceNote label="Information not provided" value={draft.informationNotProvided} lang={parent?.language ?? "en-IN"} onChange={(informationNotProvided) => setDraft({ ...draft, informationNotProvided })} />
          <VoiceNote label="Reasons for dissatisfaction" value={draft.reasonsForDissatisfaction} lang={parent?.language ?? "en-IN"} onChange={(reasonsForDissatisfaction) => setDraft({ ...draft, reasonsForDissatisfaction })} />
          <VoiceNote label="Specific second-appeal grounds" value={draft.grounds} lang={parent?.language ?? "en-IN"} onChange={(grounds) => setDraft({ ...draft, grounds })} />
          <VoiceNote label="Specific prayer / relief" value={draft.prayer} lang={parent?.language ?? "en-IN"} onChange={(prayer) => setDraft({ ...draft, prayer })} />
          <VoiceNote label="Chronology of proceedings" value={draft.chronology} lang={parent?.language ?? "en-IN"} onChange={(chronology) => setDraft({ ...draft, chronology })} />
          <DelayExplanationForm
            value={draft.delayExplanation}
            onChange={(delayExplanation) => setDraft({ ...draft, delayExplanation })}
            needed={Boolean(window && !window.eligible)}
          />
          {!draft.noFaaDecision && (
            <AttachmentUploader
              caseId={editing?.id ?? parent?.id ?? "pending"}
              kind="FAA_ORDER"
              rules={rules}
              label="Attach the FAA order"
              existing={editing?.attachments ?? parent?.attachments ?? []}
              record={editing ?? parent ?? undefined}
              onAdded={(attachment) => {
                if (editing) setEditing({ ...editing, attachments: [...editing.attachments, attachment] });
              }}
            />
          )}
          <label className="applicant-check">
            <input
              type="checkbox"
              checked={draft.furnishedCopyToAuthority}
              onChange={(event) => setDraft({ ...draft, furnishedCopyToAuthority: event.target.checked })}
            />
            <span>I will furnish a copy of this appeal to the public authority.</span>
          </label>
          {reconstruct && <ApplicantForm value={applicant} onChange={setApplicant} problems={problems} />}
          {error && <p className="step-error" role="alert">{error}</p>}
          <div className="step-actions">
            <button type="button" className="primary-button" onClick={() => void submit()} disabled={busy}>
              {busy ? "Preparing…" : "Prepare the Commission packet"}
            </button>
            <Link className="ghost-button" href={parentId ? casePath(parentId) : "/cases"}>Back</Link>
          </div>
        </div>
      </article>
    </WorkspaceShell>
  );
}

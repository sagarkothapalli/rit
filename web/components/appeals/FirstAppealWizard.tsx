"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "@/components/SiteLink";
import { useSiteRouter } from "@/hooks/useSiteRouter";
import WorkspaceShell from "@/components/cases/WorkspaceShell";
import ApplicantForm from "@/components/ApplicantForm";
import AttachmentUploader from "@/components/attachments/AttachmentUploader";
import AppealGroundsForm from "./AppealGroundsForm";
import DelayExplanationForm from "./DelayExplanationForm";
import VoiceNote from "./VoiceNote";
import type { CaseRecord, FirstAppealDraftPayload } from "@/lib/domain/case";
import { firstAppealWindow } from "@/lib/deadlines/calculate";
import { filingRulesFor } from "@/lib/filing-rules/registry";
import { copyAttachments, fetchCase, listCasesLocal, saveCase } from "@/lib/storage/cases.client";
import { createBlankCase, emptyFirstAppealDraft, hydrateCase } from "@/lib/storage/factory";
import { verifiedEmail } from "@/lib/application-records";
import { firstAppealErrors } from "@/lib/appeals/validate";
import { casePath } from "@/lib/storage/paths";
import { emptyApplicant, validateApplicant, type ApplicantDetails, type FieldProblem } from "@/lib/applicant";
import type { ExtractedAppealFacts } from "@/lib/appeals/extract";

export default function FirstAppealWizard({
  parentId,
  editCaseId,
}: {
  parentId?: string;
  editCaseId?: string;
}) {
  const router = useSiteRouter();
  const [parent, setParent] = useState<CaseRecord | null>(null);
  const [editing, setEditing] = useState<CaseRecord | null>(null);
  const [parents, setParents] = useState<CaseRecord[]>([]);
  const [draft, setDraft] = useState<FirstAppealDraftPayload>(emptyFirstAppealDraft());
  const [branchId, setBranchId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState<FieldProblem[]>([]);
  const [applicant, setApplicant] = useState<ApplicantDetails>(emptyApplicant());

  useEffect(() => {
    let active = true;
    void (async () => {
      if (editCaseId) {
        const record = await fetchCase(editCaseId);
        if (!active || !record) return;
        setEditing(record);
        setApplicant(record.applicant);
        const payload = record.draft.payload.kind === "FIRST_APPEAL" ? record.draft.payload : emptyFirstAppealDraft();
        setDraft(payload);
        setBranchId(payload.targetOfficialReferenceId ?? "");
        if (record.parentCaseId) {
          const related = await fetchCase(record.parentCaseId);
          if (related) setParent(related);
        }
        return;
      }
      if (parentId && parentId !== "new") {
        const record = await fetchCase(parentId);
        if (!active || !record) return;
        setParent(record);
        const primary = record.officialReferences.find((item) => item.isPrimary) ?? record.officialReferences[0];
        setBranchId(primary?.id ?? "");
        setDraft((current) => ({
          ...current,
          originalRegistrationNumber: primary?.registrationNumber ?? "",
          originalFiledAt: primary?.filedAt ?? "",
          targetOfficialReferenceId: primary?.id ?? null,
          originalRequestSummary: record.title,
        }));
        return;
      }
      const summaries = await listCasesLocal();
      const loaded: CaseRecord[] = [];
      for (const item of summaries.filter((row) => row.caseType === "RTI_REQUEST")) {
        const record = await fetchCase(item.id);
        if (record) loaded.push(record);
      }
      if (active) setParents(loaded);
    })();
    return () => {
      active = false;
    };
  }, [parentId, editCaseId]);

  const rules = filingRulesFor({
    caseType: "FIRST_APPEAL",
    jurisdiction: parent?.jurisdiction ?? editing?.jurisdiction ?? "UNCLEAR",
    onlineCentral: (parent ?? editing)?.ruleDestination === "rti-online-central",
  });
  const window = useMemo(() => {
    if (!draft.originalFiledAt) return null;
    return firstAppealWindow({
      filedAt: draft.originalFiledAt,
      replyReceivedAt: draft.noResponse ? null : draft.replyDate,
      rule: rules,
      lifeOrLiberty: parent?.draft.payload.kind === "RTI_REQUEST" ? parent.draft.payload.lifeOrLiberty : false,
      thirdParty: parent?.draft.payload.kind === "RTI_REQUEST" ? parent.draft.payload.thirdParty : false,
    });
  }, [draft.originalFiledAt, draft.noResponse, draft.replyDate, rules, parent]);

  function applyExtracted(facts: ExtractedAppealFacts) {
    setDraft((current) => ({
      ...current,
      ground: current.ground ?? facts.groundHint,
      originalRegistrationNumber: current.originalRegistrationNumber || facts.registrationNumbers[0] || "",
      originalFiledAt: current.originalFiledAt || facts.dates[0] || null,
      background: current.background || facts.background,
      groundsAndRelief: current.groundsAndRelief || facts.grounds,
      informationNotSupplied: current.informationNotSupplied || facts.informationNotSupplied,
      chronology: current.chronology || facts.dates.map((day) => `${day}: as stated`).join("\n"),
    }));
  }

  async function submit() {
    setError(null);
    const late = Boolean(window && !window.eligible);
    const working = editing ?? (await createBlankCase({
      caseType: "FIRST_APPEAL",
      ownerEmail: (await verifiedEmail()) ?? parent?.ownerEmail ?? "unverified@local",
      parentCaseId: parent?.id ?? null,
      jurisdiction: parent?.jurisdiction ?? "UNCLEAR",
      authorityName: parent?.authorityName ?? "Not selected",
      title: `First appeal — ${parent?.title ?? draft.originalRegistrationNumber}`,
    }));
    const applicantProblems = !parent ? validateApplicant(working.applicant) : [];
    setProblems(applicantProblems);
    const errors = firstAppealErrors(
      { ...draft, targetOfficialReferenceId: branchId || draft.targetOfficialReferenceId },
      parent,
      { late, requireApplicant: !parent, record: working },
    );
    if (errors.length) {
      setError(errors[0]);
      return;
    }
    setBusy(true);
    try {
      let child = hydrateCase(working);
      child.targetOfficialReferenceId = branchId || null;
      child.draft.payload = { ...draft, targetOfficialReferenceId: branchId || null };
      child.draft.version = editCaseId ? child.draft.version + 1 : child.draft.version;
      child.draftVersion = child.draft.version;
      child.applicant = parent ? parent.applicant : { ...applicant, ownerEmail: applicant.email || child.ownerEmail };
      child.preparationStatus = "READY_FOR_REVIEW";
      child.jurisdiction = parent?.jurisdiction ?? child.jurisdiction;
      if (parent && !editCaseId) {
        child = await copyAttachments(parent, child, ["APPLICATION_PDF", "CPIO_REPLY", "SUPPORTING", "BPL_PROOF"]);
      }
      await saveCase(child);
      router.push(casePath(child.id, "filing"));
    } catch {
      setError("The first appeal could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  const reconstruct = !parent && !editCaseId;

  return (
    <WorkspaceShell>
      <article className="workspace-panel">
        <div className="step-body">
          <h1>{editCaseId ? "Edit first appeal." : "First appeal."}</h1>
          <p className="step-lede">
            Section 19(1). This packet is prepared here. You file it with the First Appellate Authority, not with Praja.
          </p>

          {reconstruct && (
            <label className="applicant-field">
              <span className="applicant-label">Related RTI request</span>
              <select
                value=""
                onChange={(event) => {
                  const found = parents.find((item) => item.id === event.target.value);
                  if (found) {
                    setParent(found);
                    const primary = found.officialReferences[0];
                    setBranchId(primary?.id ?? "");
                    setDraft((current) => ({
                      ...current,
                      originalRegistrationNumber: primary?.registrationNumber ?? "",
                      originalFiledAt: primary?.filedAt ?? "",
                    }));
                  }
                }}
              >
                <option value="">I already filed elsewhere — enter the details below</option>
                {parents.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.prajaReference} — {item.title}
                  </option>
                ))}
              </select>
            </label>
          )}

          {parent && parent.officialReferences.length > 1 && (
            <label className="applicant-field">
              <span className="applicant-label">Which official branch is this appeal against?<em> *</em></span>
              <select value={branchId} onChange={(event) => setBranchId(event.target.value)}>
                <option value="">Select the registration number</option>
                {parent.officialReferences.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.registrationNumber} · {item.referenceKind.replaceAll("_", " ").toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="applicant-row">
            <label className="applicant-field">
              <span className="applicant-label">Original registration number<em> *</em></span>
              <input
                value={draft.originalRegistrationNumber}
                onChange={(event) => setDraft({ ...draft, originalRegistrationNumber: event.target.value })}
              />
            </label>
            <label className="applicant-field">
              <span className="applicant-label">Original filing date<em> *</em></span>
              <input
                type="date"
                value={draft.originalFiledAt ?? ""}
                onChange={(event) => setDraft({ ...draft, originalFiledAt: event.target.value })}
              />
            </label>
          </div>

          <label className="applicant-check">
            <input
              type="checkbox"
              checked={draft.noResponse}
              onChange={(event) => setDraft({ ...draft, noResponse: event.target.checked })}
            />
            <span>No response was received within the applicable time.</span>
          </label>

          {!draft.noResponse && (
            <label className="applicant-field">
              <span className="applicant-label">CPIO reply date<em> *</em></span>
              <input
                type="date"
                value={draft.replyDate ?? ""}
                onChange={(event) => setDraft({ ...draft, replyDate: event.target.value })}
              />
            </label>
          )}

          {window && <p className={window.eligible ? "step-hint" : "step-error"}>{window.explanation}</p>}

          <div className="applicant-row">
            <label className="applicant-field">
              <span className="applicant-label">CPIO / SPIO name</span>
              <input value={draft.pioName} onChange={(event) => setDraft({ ...draft, pioName: event.target.value })} />
            </label>
            <label className="applicant-field">
              <span className="applicant-label">Designation</span>
              <input value={draft.pioDesignation} onChange={(event) => setDraft({ ...draft, pioDesignation: event.target.value })} />
            </label>
          </div>
          <div className="applicant-row">
            <label className="applicant-field">
              <span className="applicant-label">First Appellate Authority</span>
              <input value={draft.faaName} onChange={(event) => setDraft({ ...draft, faaName: event.target.value })} />
            </label>
            <label className="applicant-field">
              <span className="applicant-label">FAA designation</span>
              <input value={draft.faaDesignation} onChange={(event) => setDraft({ ...draft, faaDesignation: event.target.value })} />
            </label>
          </div>

          <AppealGroundsForm value={draft.ground} onChange={(ground) => setDraft({ ...draft, ground })} />
          <VoiceNote
            label="What happened"
            value={draft.background}
            lang={parent?.language ?? editing?.language ?? "en-IN"}
            guided
            onExtracted={applyExtracted}
            onChange={(background) => setDraft({ ...draft, background })}
          />
          <VoiceNote
            label="Information requested but not supplied"
            value={draft.informationNotSupplied}
            lang={parent?.language ?? "en-IN"}
            onChange={(informationNotSupplied) => setDraft({ ...draft, informationNotSupplied })}
          />
          <VoiceNote
            label="Grounds and requested relief"
            value={draft.groundsAndRelief}
            lang={parent?.language ?? "en-IN"}
            onChange={(groundsAndRelief) => setDraft({ ...draft, groundsAndRelief })}
          />
          <VoiceNote
            label="Proceeding chronology"
            value={draft.chronology}
            lang={parent?.language ?? "en-IN"}
            onChange={(chronology) => setDraft({ ...draft, chronology })}
          />
          <DelayExplanationForm
            value={draft.delayExplanation}
            onChange={(delayExplanation) => setDraft({ ...draft, delayExplanation })}
            needed={Boolean(window && !window.eligible)}
          />

          {!draft.noResponse && (
            <AttachmentUploader
              caseId={editing?.id ?? parent?.id ?? "pending"}
              kind="CPIO_REPLY"
              rules={rules}
              label="Attach the CPIO / SPIO reply"
              existing={editing?.attachments ?? parent?.attachments ?? []}
              record={editing ?? parent ?? undefined}
              onAdded={(attachment) => {
                if (editing) setEditing({ ...editing, attachments: [...editing.attachments, attachment] });
                else if (parent) setParent({ ...parent, attachments: [...parent.attachments, attachment] });
              }}
            />
          )}

          {reconstruct && (
            <ApplicantForm value={applicant} onChange={setApplicant} problems={problems} />
          )}

          {error && <p className="step-error" role="alert">{error}</p>}
          <div className="step-actions">
            <button type="button" className="primary-button" onClick={() => void submit()} disabled={busy}>
              {busy ? "Preparing…" : editCaseId ? "Save and open the packet" : "Prepare the first-appeal packet"}
            </button>
            <Link className="ghost-button" href={parent ? casePath(parent.id) : "/cases"}>
              Back
            </Link>
          </div>
        </div>
      </article>
    </WorkspaceShell>
  );
}

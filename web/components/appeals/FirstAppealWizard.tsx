"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import WorkspaceShell from "@/components/cases/WorkspaceShell";
import AppealGroundsForm from "./AppealGroundsForm";
import DelayExplanationForm from "./DelayExplanationForm";
import VoiceNote from "./VoiceNote";
import type { CaseRecord, FirstAppealDraftPayload, OfficialReference } from "@/lib/domain/case";
import { firstAppealWindow } from "@/lib/deadlines/calculate";
import { filingRulesFor } from "@/lib/filing-rules/registry";
import { fetchCase, listCasesLocal, saveCase } from "@/lib/storage/cases.client";
import { createBlankCase, emptyFirstAppealDraft } from "@/lib/storage/factory";
import { verifiedEmail } from "@/lib/application-records";

export default function FirstAppealWizard({ parentId }: { parentId?: string }) {
  const router = useRouter();
  const [parent, setParent] = useState<CaseRecord | null>(null);
  const [parents, setParents] = useState<CaseRecord[]>([]);
  const [draft, setDraft] = useState<FirstAppealDraftPayload>(emptyFirstAppealDraft());
  const [branchId, setBranchId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
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
  }, [parentId]);

  const rules = filingRulesFor({
    caseType: "FIRST_APPEAL",
    jurisdiction: parent?.jurisdiction ?? "UNCLEAR",
    onlineCentral: parent?.ruleDestination === "rti-online-central",
  });
  const selectedBranch: OfficialReference | undefined = parent?.officialReferences.find((item) => item.id === branchId);
  const window = useMemo(() => {
    if (!draft.originalFiledAt) return null;
    return firstAppealWindow({
      filedAt: draft.originalFiledAt,
      replyReceivedAt: draft.noResponse ? null : draft.replyDate,
      rule: rules,
    });
  }, [draft.originalFiledAt, draft.noResponse, draft.replyDate, rules]);

  async function submit() {
    setError(null);
    if (!draft.ground) {
      setError("Select the ground for appeal.");
      return;
    }
    if (!draft.originalRegistrationNumber.trim() || !draft.originalFiledAt) {
      setError("Enter the original official registration number and filing date.");
      return;
    }
    if (parent && parent.officialReferences.length > 1 && !branchId) {
      setError("Choose the exact official branch you are appealing.");
      return;
    }
    setBusy(true);
    try {
      const email = (await verifiedEmail()) ?? parent?.ownerEmail ?? "unverified@local";
      const child = await createBlankCase({
        caseType: "FIRST_APPEAL",
        ownerEmail: email,
        parentCaseId: parent?.id ?? null,
        jurisdiction: parent?.jurisdiction ?? "UNCLEAR",
        authorityName: parent?.authorityName ?? "Not selected",
        title: `First appeal — ${parent?.title ?? draft.originalRegistrationNumber}`,
      });
      child.targetOfficialReferenceId = branchId || null;
      child.draft.payload = { ...draft, targetOfficialReferenceId: branchId || null };
      child.applicant = parent?.applicant ?? child.applicant;
      child.preparationStatus = "READY_FOR_REVIEW";
      await saveCase(child);
      router.push(`/cases/${child.id}/filing`);
    } catch {
      setError("The first appeal could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <WorkspaceShell>
      <article className="workspace-panel">
        <div className="step-body">
          <h1>First appeal.</h1>
          <p className="step-lede">
            Section 19(1). This packet is prepared here. You file it with the First Appellate Authority, not with Praja.
          </p>

          {!parent && (
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
              {selectedBranch && (
                <small className="applicant-hint">Appeals must target this exact reference, not a sibling transfer.</small>
              )}
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
              <span className="applicant-label">CPIO reply date</span>
              <input
                type="date"
                value={draft.replyDate ?? ""}
                onChange={(event) => setDraft({ ...draft, replyDate: event.target.value })}
              />
            </label>
          )}

          {window && (
            <p className={window.eligible ? "step-hint" : "step-error"}>
              {window.explanation}
            </p>
          )}

          <AppealGroundsForm value={draft.ground} onChange={(ground) => setDraft({ ...draft, ground })} />
          <VoiceNote label="Neutral background" value={draft.background} onChange={(background) => setDraft({ ...draft, background })} />
          <VoiceNote
            label="Information requested but not supplied"
            value={draft.informationNotSupplied}
            onChange={(informationNotSupplied) => setDraft({ ...draft, informationNotSupplied })}
          />
          <VoiceNote
            label="Grounds and requested relief"
            value={draft.groundsAndRelief}
            onChange={(groundsAndRelief) => setDraft({ ...draft, groundsAndRelief })}
          />
          <DelayExplanationForm
            value={draft.delayExplanation}
            onChange={(delayExplanation) => setDraft({ ...draft, delayExplanation })}
            needed={Boolean(window && !window.eligible)}
          />

          {parent?.filingChannel && parent.filingChannel.toLowerCase().includes("physical") && (
            <p className="step-hint">
              If the original filing was physical or on a State channel, an online first appeal may not be available.
              The packet will still be generated for the correct channel.
            </p>
          )}

          {error && <p className="step-error" role="alert">{error}</p>}
          <div className="step-actions">
            <button type="button" className="primary-button" onClick={() => void submit()} disabled={busy}>
              {busy ? "Preparing…" : "Prepare the first-appeal packet"}
            </button>
            <Link className="ghost-button" href={parent ? `/cases/${parent.id}` : "/cases"}>
              Back
            </Link>
          </div>
        </div>
      </article>
    </WorkspaceShell>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCaseId } from "@/hooks/useCaseId";
import WorkspaceShell from "@/components/cases/WorkspaceShell";
import CaseHeader from "@/components/cases/CaseHeader";
import CaseTimeline from "@/components/cases/CaseTimeline";
import CaseChain from "@/components/cases/CaseChain";
import DeadlineCard from "@/components/cases/DeadlineCard";
import NextActionCard from "@/components/cases/NextActionCard";
import AttachmentList from "@/components/attachments/AttachmentList";
import type { CaseRecord, CaseSummary, ReminderPreferences } from "@/lib/domain/case";
import { toSummary } from "@/lib/domain/case";
import type { AttachmentRecord } from "@/lib/domain/attachments";
import { refreshDeadlineStatus } from "@/lib/deadlines/calculate";
import { deleteCase, downloadAttachmentBytes, fetchCase, listCasesLocal, saveCase } from "@/lib/storage/cases.client";
import { downloadBlob } from "@/lib/application-records";
import { remindersForCase } from "@/lib/notifications/reminders";
import { fallbackPreview, scheduleNotifications } from "@/lib/notifications/outbox";

export default function CaseDetailPage() {
  const caseId = useCaseId();
  const router = useRouter();
  const [record, setRecord] = useState<CaseRecord | null>(null);
  const [chain, setChain] = useState<CaseSummary[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const found = await fetchCase(caseId);
      if (!active) return;
      setRecord(found);
      if (!found) return;
      const all = await listCasesLocal(found.ownerEmail);
      const related = all.filter((item) => item.id === found.id || item.parentCaseId === found.id || item.id === found.parentCaseId);
      if (found.parentCaseId && !related.some((item) => item.id === found.parentCaseId)) {
        const parent = await fetchCase(found.parentCaseId);
        if (parent) related.unshift(toSummary(parent));
      }
      if (active) setChain(related);
    })();
    return () => {
      active = false;
    };
  }, [caseId]);

  if (!record) {
    return (
      <WorkspaceShell>
        <article className="workspace-panel">
          <div className="step-body">
            <h1>Case not found.</h1>
            <p className="step-lede">Check the Praja Acknowledgement Number, or open the case list.</p>
            <Link className="primary-button" href="/cases">My RTI cases</Link>
          </div>
        </article>
      </WorkspaceShell>
    );
  }

  const deadlines = record.deadlines.map((item) => refreshDeadlineStatus(item));
  const reminders = remindersForCase({ ...record, deadlines });
  const outbox = fallbackPreview(scheduleNotifications({ ...record, deadlines }));

  const appPdf = record.attachments.find(
    (item) => !item.deletedAt && (item.kind === "APPLICATION_PDF" || item.kind === "FULL_REQUEST_PDF" || item.originalName.endsWith(".pdf")),
  );
  const receiptPdf = record.attachments.find(
    (item) => !item.deletedAt && (item.kind === "RECEIPT_PDF" || item.originalName.includes("acknowledgement")),
  );

  async function handleDownload(item: AttachmentRecord) {
    const blob = await downloadAttachmentBytes(record!.id, item.id);
    if (!blob) return;
    downloadBlob(item.storedName, new Blob([blob.bytes], { type: item.mimeType }));
  }

  async function setPrefs(next: ReminderPreferences) {
    if (!record) return;
    const updated: CaseRecord = {
      ...record,
      reminderPreferences: next,
      remindersEnabled: next.inApp || next.email || next.sms,
      updatedAt: new Date().toISOString(),
    };
    await saveCase(updated);
    setRecord(updated);
  }

  async function remove() {
    if (!record) return;
    setBusy(true);
    await deleteCase(record.id, true);
    router.push("/cases");
  }

  return (
    <WorkspaceShell>
      <article className="workspace-panel">
        <div className="step-body">
          <CaseChain currentId={record.id} chain={chain} />
          <CaseHeader record={record} />
          <p>
            {record.authorityName}
            {record.filingChannel ? ` · ${record.filingChannel}` : ""}
          </p>

          {(appPdf || receiptPdf) && (
            <div className="step-actions" style={{ marginTop: "16px", marginBottom: "20px" }}>
              {appPdf && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void handleDownload(appPdf)}
                >
                  Download {record.caseType === "SECTION_18_COMPLAINT" ? "complaint" : "application"} PDF
                </button>
              )}
              {receiptPdf && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void handleDownload(receiptPdf)}
                >
                  Download receipt
                </button>
              )}
            </div>
          )}

          {/* Context & details */}
          {record.draft.payload.kind === "SECTION_18_COMPLAINT" && (
            <div style={{ background: "var(--surface-soft)", padding: "16px 20px", borderRadius: "10px", margin: "16px 0 24px", border: "1px solid var(--line)" }}>
              <h3 style={{ margin: "0 0 10px", fontSize: "1.05rem" }}>Complaint details</h3>
              {record.draft.payload.ground && (
                <p style={{ margin: "0 0 8px" }}>
                  <strong>Ground:</strong> {record.draft.payload.ground.replaceAll("_", " ")}
                </p>
              )}
              {record.draft.payload.facts && (
                <p style={{ margin: "0 0 8px" }}>
                  <strong>Facts:</strong> {record.draft.payload.facts}
                </p>
              )}
              {record.draft.payload.relief && (
                <p style={{ margin: "0 0 8px" }}>
                  <strong>Relief sought:</strong> {record.draft.payload.relief}
                </p>
              )}
              {record.draft.payload.relatedRegistrationNumber && (
                <p style={{ margin: "0" }}>
                  <strong>Related RTI registration:</strong> {record.draft.payload.relatedRegistrationNumber}
                </p>
              )}
            </div>
          )}

          {record.draft.payload.kind === "RTI_REQUEST" && (
            <div style={{ background: "var(--surface-soft)", padding: "16px 20px", borderRadius: "10px", margin: "16px 0 24px", border: "1px solid var(--line)" }}>
              <h3 style={{ margin: "0 0 10px", fontSize: "1.05rem" }}>Request details</h3>
              {record.draft.payload.draft?.background && (
                <p style={{ margin: "0 0 8px" }}>
                  <strong>Background:</strong> {record.draft.payload.draft.background}
                </p>
              )}
              {record.draft.payload.draft?.requests && record.draft.payload.draft.requests.length > 0 && (
                <div>
                  <strong>Records requested:</strong>
                  <ol style={{ paddingLeft: "20px", margin: "6px 0 0" }}>
                    {record.draft.payload.draft.requests.map((item, idx) => (
                      <li key={idx} style={{ marginBottom: "4px" }}>{item}</li>
                    ))}
                  </ol>
                </div>
              )}
              {!record.draft.payload.draft?.requests?.length && record.draft.payload.notes?.records_sought && (
                <p style={{ margin: "0" }}>
                  <strong>Records sought:</strong> {record.draft.payload.notes.records_sought}
                </p>
              )}
            </div>
          )}

          {(record.draft.payload.kind === "FIRST_APPEAL" || record.draft.payload.kind === "SECOND_APPEAL") && (
            <div style={{ background: "var(--surface-soft)", padding: "16px 20px", borderRadius: "10px", margin: "16px 0 24px", border: "1px solid var(--line)" }}>
              <h3 style={{ margin: "0 0 10px", fontSize: "1.05rem" }}>Appeal details</h3>
              {record.draft.payload.kind === "FIRST_APPEAL" && (
                <>
                  {record.draft.payload.informationNotSupplied && (
                    <p style={{ margin: "0 0 8px" }}>
                      <strong>Information not supplied:</strong> {record.draft.payload.informationNotSupplied}
                    </p>
                  )}
                  {record.draft.payload.groundsAndRelief && (
                    <p style={{ margin: "0" }}>
                      <strong>Grounds & Relief:</strong> {record.draft.payload.groundsAndRelief}
                    </p>
                  )}
                </>
              )}
              {record.draft.payload.kind === "SECOND_APPEAL" && (
                <>
                  {record.draft.payload.informationNotProvided && (
                    <p style={{ margin: "0 0 8px" }}>
                      <strong>Information not provided:</strong> {record.draft.payload.informationNotProvided}
                    </p>
                  )}
                  {record.draft.payload.prayer && (
                    <p style={{ margin: "0" }}>
                      <strong>Prayer:</strong> {record.draft.payload.prayer}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {reminders.length > 0 && (
            <ul className="case-reminders">
              {reminders.map((item) => (
                <li key={item.id}>{item.title}: {item.body}</li>
              ))}
            </ul>
          )}
          <fieldset className="reminder-prefs">
            <legend>Reminder preferences</legend>
            <label className="applicant-check">
              <input
                type="checkbox"
                checked={record.reminderPreferences.inApp}
                onChange={(event) => void setPrefs({ ...record.reminderPreferences, inApp: event.target.checked })}
              />
              <span>On-screen reminders</span>
            </label>
            <label className="applicant-check">
              <input
                type="checkbox"
                checked={record.reminderPreferences.email}
                onChange={(event) => void setPrefs({ ...record.reminderPreferences, email: event.target.checked })}
              />
              <span>Email (sandbox preview until a mail provider is configured)</span>
            </label>
            <label className="applicant-check">
              <input
                type="checkbox"
                checked={record.reminderPreferences.sms}
                onChange={(event) => void setPrefs({ ...record.reminderPreferences, sms: event.target.checked })}
              />
              <span>SMS (sandbox preview)</span>
            </label>
          </fieldset>
          {outbox.length > 0 && (
            <p className="applicant-hint">
              {outbox.length} scheduled notice{outbox.length === 1 ? "" : "s"} in the fallback outbox.
            </p>
          )}
          <div className="case-detail-grid">
            <div>
              <h2>Timeline</h2>
              <CaseTimeline record={record} />
              <h2>Documents</h2>
              <AttachmentList items={record.attachments} caseId={record.id} />
            </div>
            <div>
              <NextActionCard record={record} />
              {deadlines.map((item) => (
                <DeadlineCard key={item.id} deadline={item} />
              ))}
              <button type="button" className="link-button is-danger" onClick={() => void remove()} disabled={busy}>
                {busy ? "Removing…" : "Delete this case and its documents"}
              </button>
            </div>
          </div>
        </div>
      </article>
    </WorkspaceShell>
  );
}

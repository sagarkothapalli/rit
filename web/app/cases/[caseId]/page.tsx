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
import { refreshDeadlineStatus } from "@/lib/deadlines/calculate";
import { deleteCase, fetchCase, getAccessToken, listCasesLocal, saveCase } from "@/lib/storage/cases.client";
import { remindersForCase } from "@/lib/notifications/reminders";
import { fallbackPreview, scheduleNotifications } from "@/lib/notifications/outbox";

export default function CaseDetailPage() {
  const caseId = useCaseId();
  const router = useRouter();
  const [record, setRecord] = useState<CaseRecord | null>(null);
  const [chain, setChain] = useState<CaseSummary[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const found = await fetchCase(caseId);
      if (!active) return;
      setRecord(found);
      if (!found) return;
      setToken(await getAccessToken(found.id));
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
            <p className="step-lede">Check the Praja reference, or open the case list.</p>
            <Link className="primary-button" href="/cases">My RTI cases</Link>
          </div>
        </article>
      </WorkspaceShell>
    );
  }

  const deadlines = record.deadlines.map((item) => refreshDeadlineStatus(item));
  const reminders = remindersForCase({ ...record, deadlines });
  const outbox = fallbackPreview(scheduleNotifications({ ...record, deadlines }));

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
          {token && (
            <p className="step-hint">
              Workspace recovery token (keep with the Praja reference): <strong>{token}</strong>
            </p>
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

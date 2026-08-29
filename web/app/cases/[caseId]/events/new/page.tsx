"use client";

import { useEffect, useState } from "react";
import Link from "@/components/SiteLink";
import { useSiteRouter } from "@/hooks/useSiteRouter";
import { useCaseId } from "@/hooks/useCaseId";
import WorkspaceShell from "@/components/cases/WorkspaceShell";
import AttachmentUploader from "@/components/attachments/AttachmentUploader";
import type { AttachmentKind } from "@/lib/domain/attachments";
import type { CaseEventType } from "@/lib/domain/events";
import type { CaseRecord } from "@/lib/domain/case";
import { applyCaseEvent } from "@/lib/deadlines/lifecycle";
import { filingRulesFor } from "@/lib/filing-rules/registry";
import { fetchCase, jsonOk, saveCase } from "@/lib/storage/cases.client";
import { newId } from "@/lib/storage/id";
import { casePath } from "@/lib/storage/paths";

const EVENTS: Array<{ type: CaseEventType; label: string; kind?: AttachmentKind }> = [
  { type: "REPLY_RECEIVED", label: "Reply received", kind: "CPIO_REPLY" },
  { type: "FAA_DECISION_RECEIVED", label: "FAA decision received", kind: "FAA_ORDER" },
  { type: "COMMISSION_NOTICE_RECEIVED", label: "Commission notice or order received" },
  { type: "REQUEST_TRANSFERRED", label: "Request transferred" },
  { type: "REQUEST_PART_TRANSFERRED", label: "Request part-transferred" },
  { type: "ADDITIONAL_FEE_DEMAND", label: "Additional fee demanded" },
  { type: "ADDITIONAL_FEE_PAID", label: "Additional fee paid" },
  { type: "SUPPORTING_DOCUMENT_REQUESTED", label: "Supporting document requested" },
  { type: "REQUEST_RETURNED", label: "Request returned" },
  { type: "CASE_DISPOSED", label: "Case disposed" },
  { type: "CASE_CLOSED", label: "Case closed" },
];

export default function NewEventPage() {
  const caseId = useCaseId();
  const router = useSiteRouter();
  const [record, setRecord] = useState<CaseRecord | null>(null);
  const [eventType, setEventType] = useState<CaseEventType>("REPLY_RECEIVED");
  const [occurredAt, setOccurredAt] = useState("");
  const [note, setNote] = useState("");
  const [branchId, setBranchId] = useState("");
  const [transferNumber, setTransferNumber] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetchCase(caseId).then((found) => {
      setRecord(found);
      setBranchId(found?.officialReferences.find((item) => item.isPrimary)?.id ?? found?.officialReferences[0]?.id ?? "");
    });
  }, [caseId]);

  if (!record) {
    return (
      <WorkspaceShell>
        <article className="workspace-panel">
          <div className="step-body">
            <h1>Case not found.</h1>
            <Link className="primary-button" href="/cases">My RTI cases</Link>
          </div>
        </article>
      </WorkspaceShell>
    );
  }

  const selected = EVENTS.find((item) => item.type === eventType);
  const rules = filingRulesFor({ caseType: record.caseType, jurisdiction: record.jurisdiction });

  async function submit() {
    if (!record || !occurredAt) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/cases/${encodeURIComponent(record.id)}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          eventType,
          occurredAt,
          officialReferenceId: branchId || null,
          transferNumber,
          payload: { note },
        }),
      });
      if (res.ok && jsonOk(res)) {
        router.push(casePath(record.id));
        return;
      }
      const now = new Date().toISOString();
      const newReference =
        (eventType === "REQUEST_TRANSFERRED" || eventType === "REQUEST_PART_TRANSFERRED") && transferNumber.trim()
          ? {
              id: newId(),
              caseId: record.id,
              registrationNumber: transferNumber.trim(),
              referenceKind: eventType === "REQUEST_PART_TRANSFERRED" ? "PART_TRANSFER" as const : "TRANSFER" as const,
              source: "USER_REPORTED" as const,
              filedAt: occurredAt,
              receivedAt: occurredAt,
              parentOfficialReferenceId: branchId || null,
              isPrimary: eventType === "REQUEST_TRANSFERRED",
              createdAt: now,
            }
          : undefined;
      const next = applyCaseEvent(
        record,
        {
          id: newId(),
          caseId: record.id,
          officialReferenceId: branchId || null,
          eventType,
          source: "USER_REPORTED",
          occurredAt,
          recordedAt: now,
          payload: { note, transferNumber },
          createdBy: record.ownerEmail,
          idempotencyKey: `event:${record.id}:${eventType}:${occurredAt}:${transferNumber}`,
        },
        { newReference },
      );
      await saveCase(next);
      router.push(casePath(record.id));
    } finally {
      setBusy(false);
    }
  }

  return (
    <WorkspaceShell>
      <article className="workspace-panel">
        <div className="step-body">
          <h1>Record an event.</h1>
          <p className="step-lede">
            Replies, transfers, fees, and orders you record here are labelled as user-reported until a connector
            confirms them.
          </p>
          {record.officialReferences.length > 1 && (
            <label className="applicant-field">
              <span className="applicant-label">Official branch</span>
              <select value={branchId} onChange={(event) => setBranchId(event.target.value)}>
                {record.officialReferences.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.registrationNumber} · {item.referenceKind.replaceAll("_", " ").toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="applicant-field">
            <span className="applicant-label">What happened</span>
            <select value={eventType} onChange={(event) => setEventType(event.target.value as CaseEventType)}>
              {EVENTS.map((item) => (
                <option key={item.type} value={item.type}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="applicant-field">
            <span className="applicant-label">Date</span>
            <input type="date" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} />
          </label>
          {(eventType === "REQUEST_TRANSFERRED" || eventType === "REQUEST_PART_TRANSFERRED") && (
            <label className="applicant-field">
              <span className="applicant-label">New official registration number</span>
              <input value={transferNumber} onChange={(event) => setTransferNumber(event.target.value)} />
            </label>
          )}
          <label className="applicant-field">
            <span className="applicant-label">Note</span>
            <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          {selected?.kind && (
            <AttachmentUploader
              caseId={record.id}
              kind={selected.kind}
              rules={rules}
              label="Attach the official document"
              existing={record.attachments}
              record={record}
              onAdded={(attachment) => {
                setRecord({ ...record, attachments: [...record.attachments, attachment] });
              }}
            />
          )}
          <div className="step-actions">
            <button type="button" className="primary-button" onClick={() => void submit()} disabled={busy || !occurredAt}>
              {busy ? "Saving…" : "Save event"}
            </button>
            <Link className="ghost-button" href={casePath(record.id)}>Back</Link>
          </div>
        </div>
      </article>
    </WorkspaceShell>
  );
}

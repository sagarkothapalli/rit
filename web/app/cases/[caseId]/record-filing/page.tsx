"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import WorkspaceShell from "@/components/cases/WorkspaceShell";
import OfficialReferenceForm, { type OfficialFilingValues } from "@/components/cases/OfficialReferenceForm";
import type { CaseRecord } from "@/lib/domain/case";
import { filingRulesFor } from "@/lib/filing-rules/registry";
import { toDeadlineRecord } from "@/lib/deadlines/calculate";
import { fetchCase, saveCase } from "@/lib/storage/cases.client";
import { newId } from "@/lib/storage/id";
import type { DeadlineKind } from "@/lib/domain/case";

export default function RecordFilingPage() {
  const params = useParams<{ caseId: string }>();
  const router = useRouter();
  const [record, setRecord] = useState<CaseRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchCase(params.caseId).then(setRecord);
  }, [params.caseId]);

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

  async function submit(values: OfficialFilingValues) {
    if (!record) return;
    setBusy(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const reference = {
        id: newId(),
        caseId: record.id,
        registrationNumber: values.registrationNumber.trim(),
        referenceKind: values.referenceKind,
        source: "USER_REPORTED" as const,
        filedAt: values.filedAt,
        receivedAt: values.receivedAt || values.filedAt,
        parentOfficialReferenceId: null,
        isPrimary: record.officialReferences.length === 0,
        createdAt: now,
      };
      const rules = filingRulesFor({ caseType: record.caseType, jurisdiction: record.jurisdiction });
      const kind: DeadlineKind =
        record.caseType === "FIRST_APPEAL"
          ? "FAA_DECISION"
          : record.caseType === "SECOND_APPEAL"
            ? "SECOND_APPEAL_LIMITATION"
            : "REQUEST_RESPONSE";
      const deadline = toDeadlineRecord(newId(), {
        kind,
        startDate: values.filedAt,
        rule: rules,
        source: "USER_REPORTED",
        caseId: record.id,
        officialReferenceId: reference.id,
      });
      const next: CaseRecord = {
        ...record,
        filingStatus: "USER_REPORTED_FILED",
        outcomeStatus: "AWAITING_RESPONSE",
        officialReferences: [...record.officialReferences, reference],
        deadlines: [...record.deadlines, deadline],
        updatedAt: now,
        events: [
          ...record.events,
          {
            id: newId(),
            caseId: record.id,
            officialReferenceId: reference.id,
            eventType: "FILING_RECORDED",
            source: "USER_REPORTED",
            occurredAt: values.filedAt,
            recordedAt: now,
            payload: { ...values },
            createdBy: record.ownerEmail,
            idempotencyKey: `filing:${record.id}:${reference.registrationNumber}`,
          },
        ],
      };
      await saveCase(next);
      router.push(`/cases/${record.id}`);
    } catch {
      setError("The filing details could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <WorkspaceShell>
      <article className="workspace-panel">
        <div className="step-body">
          <h1>Record official filing.</h1>
          <p className="step-lede">
            Enter the registration number issued by the official portal or public authority. This is not a Praja
            acknowledgement, and it is not connector-confirmed until an authorized integration exists.
          </p>
          <OfficialReferenceForm
            onSubmit={(values) => void submit(values)}
            busy={busy}
            error={error}
            defaultKind={
              record.caseType === "FIRST_APPEAL"
                ? "FIRST_APPEAL"
                : record.caseType === "SECOND_APPEAL"
                  ? "SECOND_APPEAL"
                  : record.caseType === "SECTION_18_COMPLAINT"
                    ? "COMPLAINT"
                    : "ORIGINAL_REQUEST"
            }
          />
          <Link className="ghost-button" href={`/cases/${record.id}`}>Back</Link>
        </div>
      </article>
    </WorkspaceShell>
  );
}

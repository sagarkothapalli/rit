"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import WorkspaceShell from "@/components/cases/WorkspaceShell";
import CaseHeader from "@/components/cases/CaseHeader";
import CaseTimeline from "@/components/cases/CaseTimeline";
import CaseChain from "@/components/cases/CaseChain";
import DeadlineCard from "@/components/cases/DeadlineCard";
import NextActionCard from "@/components/cases/NextActionCard";
import AttachmentList from "@/components/attachments/AttachmentList";
import type { CaseRecord, CaseSummary } from "@/lib/domain/case";
import { toSummary } from "@/lib/domain/case";
import { refreshDeadlineStatus } from "@/lib/deadlines/calculate";
import { fetchCase, listCasesLocal } from "@/lib/storage/cases.client";

export default function CaseDetailPage() {
  const params = useParams<{ caseId: string }>();
  const [record, setRecord] = useState<CaseRecord | null>(null);
  const [chain, setChain] = useState<CaseSummary[]>([]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const found = await fetchCase(params.caseId);
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
  }, [params.caseId]);

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
          <div className="case-detail-grid">
            <div>
              <h2>Timeline</h2>
              <CaseTimeline record={record} />
              <h2>Documents</h2>
              <AttachmentList items={record.attachments} />
            </div>
            <div>
              <NextActionCard record={record} />
              {deadlines.map((item) => (
                <DeadlineCard key={item.id} deadline={item} />
              ))}
            </div>
          </div>
        </div>
      </article>
    </WorkspaceShell>
  );
}

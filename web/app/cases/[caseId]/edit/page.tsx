"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import RequestWizard from "@/components/request/RequestWizard";
import FirstAppealWizard from "@/components/appeals/FirstAppealWizard";
import SecondAppealWizard from "@/components/appeals/SecondAppealWizard";
import ComplaintWizard from "@/components/complaints/ComplaintWizard";
import WorkspaceShell from "@/components/cases/WorkspaceShell";
import { fetchCase } from "@/lib/storage/cases.client";
import type { CaseRecord } from "@/lib/domain/case";

export default function CaseEditPage() {
  const params = useParams<{ caseId: string }>();
  const [record, setRecord] = useState<CaseRecord | null | undefined>(undefined);

  useEffect(() => {
    void fetchCase(params.caseId).then(setRecord);
  }, [params.caseId]);

  if (record === undefined) return null;
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
  if (record.caseType === "FIRST_APPEAL") {
    return <FirstAppealWizard parentId={record.parentCaseId ?? record.id} />;
  }
  if (record.caseType === "SECOND_APPEAL") {
    return <SecondAppealWizard parentId={record.parentCaseId ?? record.id} />;
  }
  if (record.caseType === "SECTION_18_COMPLAINT") {
    return <ComplaintWizard parentId={record.parentCaseId ?? undefined} />;
  }
  return <RequestWizard />;
}

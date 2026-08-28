"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CaseDetailPage from "@/app/cases/[caseId]/page";
import FilingPage from "@/app/cases/[caseId]/filing/page";
import RecordFilingPage from "@/app/cases/[caseId]/record-filing/page";
import CaseEditPage from "@/app/cases/[caseId]/edit/page";
import FirstAppealPage from "@/app/cases/[caseId]/first-appeal/page";
import SecondAppealPage from "@/app/cases/[caseId]/second-appeal/page";
import RelatedComplaintPage from "@/app/cases/[caseId]/complaint/page";
import NewEventPage from "@/app/cases/[caseId]/events/new/page";
import { CaseIdProvider } from "@/hooks/useCaseId";

function OpenCaseInner() {
  const search = useSearchParams();
  const id = search.get("id") ?? "";
  const page = search.get("p") ?? "detail";
  const view =
    page === "filing" ? <FilingPage /> :
    page === "record-filing" ? <RecordFilingPage /> :
    page === "edit" ? <CaseEditPage /> :
    page === "first-appeal" ? <FirstAppealPage /> :
    page === "second-appeal" ? <SecondAppealPage /> :
    page === "complaint" ? <RelatedComplaintPage /> :
    page === "events/new" ? <NewEventPage /> :
    <CaseDetailPage />;
  return <CaseIdProvider value={id}>{view}</CaseIdProvider>;
}

export default function OpenCasePage() {
  return (
    <Suspense fallback={null}>
      <OpenCaseInner />
    </Suspense>
  );
}

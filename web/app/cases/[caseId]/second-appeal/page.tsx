"use client";

import { useCaseId } from "@/hooks/useCaseId";
import SecondAppealWizard from "@/components/appeals/SecondAppealWizard";

export default function SecondAppealPage() {
  const caseId = useCaseId();
  return <SecondAppealWizard parentId={caseId} />;
}

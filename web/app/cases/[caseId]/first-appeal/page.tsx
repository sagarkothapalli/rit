"use client";

import { useCaseId } from "@/hooks/useCaseId";
import FirstAppealWizard from "@/components/appeals/FirstAppealWizard";

export default function FirstAppealPage() {
  const caseId = useCaseId();
  return <FirstAppealWizard parentId={caseId} />;
}

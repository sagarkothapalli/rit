"use client";

import { useParams } from "next/navigation";
import FirstAppealWizard from "@/components/appeals/FirstAppealWizard";

export default function FirstAppealPage() {
  const params = useParams<{ caseId: string }>();
  return <FirstAppealWizard parentId={params.caseId} />;
}

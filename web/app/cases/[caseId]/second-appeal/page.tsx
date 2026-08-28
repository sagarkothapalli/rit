"use client";

import { useParams } from "next/navigation";
import SecondAppealWizard from "@/components/appeals/SecondAppealWizard";

export default function SecondAppealPage() {
  const params = useParams<{ caseId: string }>();
  return <SecondAppealWizard parentId={params.caseId} />;
}

"use client";

import { useCaseId } from "@/hooks/useCaseId";
import ComplaintWizard from "@/components/complaints/ComplaintWizard";

export default function RelatedComplaintPage() {
  const caseId = useCaseId();
  return <ComplaintWizard parentId={caseId} />;
}

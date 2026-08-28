"use client";

import { useParams } from "next/navigation";
import ComplaintWizard from "@/components/complaints/ComplaintWizard";

export default function RelatedComplaintPage() {
  const params = useParams<{ caseId: string }>();
  return <ComplaintWizard parentId={params.caseId} />;
}

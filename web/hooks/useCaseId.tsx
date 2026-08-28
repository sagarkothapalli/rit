"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useParams } from "next/navigation";

const CaseIdContext = createContext<string | null>(null);

export function CaseIdProvider({ value, children }: { value: string; children: ReactNode }) {
  return <CaseIdContext.Provider value={value}>{children}</CaseIdContext.Provider>;
}

export function useCaseId(): string {
  const fromContext = useContext(CaseIdContext);
  const params = useParams<{ caseId?: string }>();
  return fromContext || params.caseId || "";
}

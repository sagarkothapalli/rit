import type { ReactNode } from "react";

export function generateStaticParams() {
  return [{ caseId: "_" }];
}

export default function CaseIdLayout({ children }: { children: ReactNode }) {
  return children;
}

import { Suspense, type ReactNode } from "react";

export default function CasesLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

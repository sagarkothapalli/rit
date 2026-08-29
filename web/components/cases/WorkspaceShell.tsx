"use client";

import type { ReactNode } from "react";
import Link from "@/components/SiteLink";
import SiteMasthead from "@/components/SiteMasthead";

export default function WorkspaceShell({
  children,
  action,
  notice,
}: {
  children: ReactNode;
  action?: ReactNode;
  notice?: string;
}) {
  return (
    <main className="workspace">
      <SiteMasthead
        compact
        notice={notice ?? "This workspace prepares a filing packet. It does not file with a government system."}
        links={
          <>
            <Link href="/cases">My RTI cases</Link>
            <Link href="/departments">Authority directory</Link>
            <a href="https://rtionline.gov.in/" rel="noreferrer" target="_blank">Official RTI portal</a>
          </>
        }
        truth={
          <>
            <strong>Important:</strong> Praja RTI is independent citizen assistance. It is not a government portal
            and it does not file an application on your behalf.
          </>
        }
      >
        {action ?? <Link className="header-action" href="/cases">My RTI cases</Link>}
      </SiteMasthead>
      <div className="workspace-body site-container" id="main-content">
        {children}
      </div>
    </main>
  );
}

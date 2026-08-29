"use client";

import { useEffect } from "react";
import Link from "@/components/SiteLink";
import { parseCaseWorkspacePath } from "@/lib/storage/paths";

export default function NotFound() {
  useEffect(() => {
    const parsed = parseCaseWorkspacePath(window.location.pathname);
    if (!parsed) return;
    const query = new URLSearchParams({ id: parsed.id });
    if (parsed.leaf) query.set("p", parsed.leaf);
    window.location.replace(`/cases/open?${query.toString()}`);
  }, []);

  return (
    <main className="workspace-panel" style={{ margin: "40px auto", maxWidth: 640 }}>
      <div className="step-body">
        <h1>Page not found.</h1>
        <p className="step-lede">The address does not match a page on this site.</p>
        <Link className="primary-button" href="/cases">My RTI cases</Link>
      </div>
    </main>
  );
}

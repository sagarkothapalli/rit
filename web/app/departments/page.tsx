import type { Metadata } from "next";
import Link from "next/link";
import DirectoryBrowser from "@/components/DirectoryBrowser";
import Emblem from "@/components/Emblem";
import SiteMasthead from "@/components/SiteMasthead";
import { directoryStats } from "@/lib/directory-tree";
import { DIRECTORY_SNAPSHOT } from "@/lib/retrieval";

export const metadata: Metadata = {
  title: "Public authority directory | Praja RTI",
  description:
    "Browse every Central public authority listed on the RTI Online portal, grouped by ministry and department. Search by subject, office, or authority code.",
};

export default function DepartmentsPage() {
  const stats = directoryStats();
  return (
    <main className="site-shell">
      <SiteMasthead
        notice={`Central directory snapshot taken ${DIRECTORY_SNAPSHOT}`}
        links={
          <>
            <Link href="/">Home</Link>
            <a href="https://rtionline.gov.in/request/allpa.php" rel="noreferrer" target="_blank">Official list</a>
          </>
        }
        truth={
          <>
            <strong>Important:</strong> This is a dated copy of the Central directory for reference. Confirm the
            authority on the official portal before filing.
          </>
        }
      >
        <Link className="header-action" href="/request">File a complaint</Link>
      </SiteMasthead>

      <section className="page-head site-container" id="main-content">
        <h1>Public authority directory</h1>
        <p>
          {stats.authorities.toLocaleString("en-IN")} Central public authorities across{" "}
          {stats.ministries.toLocaleString("en-IN")} ministries and departments. An RTI application must go to the
          authority that actually holds the record, so start from the subject and work towards the office.
        </p>
      </section>

      <section className="site-container directory-section">
        <DirectoryBrowser />
      </section>

      <footer className="site-footer">
        <div className="site-container footer-grid">
          <div className="footer-brand">
            <Emblem className="footer-emblem" size={44} />
            <div>
              <strong>Praja RTI</strong>
              <span>Independent citizen assistance</span>
            </div>
          </div>
          <div>
            <strong>Service</strong>
            <Link href="/">Home</Link>
            <Link href="/request">File a complaint</Link>
          </div>
          <div>
            <strong>Official resources</strong>
            <a href="https://rtionline.gov.in/" rel="noreferrer" target="_blank">RTI Online</a>
            <a href="https://rtionline.gov.in/request/allpa.php" rel="noreferrer" target="_blank">All public authorities</a>
          </div>
        </div>
        <div className="site-container footer-bottom">
          <span>Praja RTI is not affiliated with the Government of India.</span>
          <span>Directory snapshot {DIRECTORY_SNAPSHOT}</span>
        </div>
      </footer>
    </main>
  );
}

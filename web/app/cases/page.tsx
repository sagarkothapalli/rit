"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "@/components/SiteLink";
import { useSearchParams } from "next/navigation";
import { useSiteRouter } from "@/hooks/useSiteRouter";
import WorkspaceShell from "@/components/cases/WorkspaceShell";
import EmailVerification from "@/components/EmailVerification";
import type { CaseSummary } from "@/lib/domain/case";
import { CASE_TYPE_LABEL, FILING_LABEL, OUTCOME_LABEL, PREPARATION_LABEL, type CaseType } from "@/lib/domain/status";
import { fetchCase, fetchCaseByReference, fetchCaseList } from "@/lib/storage/cases.client";
import { casePath } from "@/lib/storage/paths";
import { DEMO_EMAIL, verifiedEmail } from "@/lib/application-records";
import { remindersForCase } from "@/lib/notifications/reminders";

const FILTERS: Array<{ id: string; label: string; match: (row: CaseSummary) => boolean }> = [
  { id: "all", label: "All", match: () => true },
  { id: "request", label: "Requests", match: (row) => row.caseType === "RTI_REQUEST" },
  { id: "first", label: "First appeals", match: (row) => row.caseType === "FIRST_APPEAL" },
  { id: "second", label: "Second appeals", match: (row) => row.caseType === "SECOND_APPEAL" },
  { id: "complaint", label: "Complaints", match: (row) => row.caseType === "SECTION_18_COMPLAINT" },
  { id: "draft", label: "Draft", match: (row) => row.preparationStatus === "DRAFT" || row.preparationStatus === "NEEDS_INFORMATION" },
  { id: "ready", label: "Ready to file", match: (row) => row.preparationStatus === "PACKET_GENERATED" && row.filingStatus === "NOT_FILED" },
  { id: "awaiting", label: "Awaiting response", match: (row) => row.outcomeStatus === "AWAITING_RESPONSE" },
  { id: "action", label: "Action required", match: (row) => row.outcomeStatus === "ACTION_REQUIRED" },
];

export default function CasesPage() {
  const router = useSiteRouter();
  const search = useSearchParams();
  const start = search.get("start");
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [verified, setVerified] = useState<string | null>(null);
  const [rows, setRows] = useState<CaseSummary[]>([]);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reminders, setReminders] = useState<string[]>([]);
  const [referenceInput, setReferenceInput] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void verifiedEmail().then(async (found) => {
      if (!active) return;
      setVerified(found);
      if (found) setEmail(found);
      const list = await fetchCaseList(found ?? undefined);
      if (active) setRows(list);
      if (found) {
        const notes: string[] = [];
        for (const item of list.slice(0, 20)) {
          const record = await fetchCase(item.id);
          if (!record) continue;
          notes.push(...remindersForCase(record).map((reminder) => `${reminder.title}: ${item.prajaReference}`));
        }
        if (active) setReminders(notes.slice(0, 5));
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const visible = useMemo(() => {
    const rule = FILTERS.find((item) => item.id === filter) ?? FILTERS[0];
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (!rule.match(row)) return false;
      if (!needle) return true;
      return [row.prajaReference, row.title, row.authorityName].join(" ").toLowerCase().includes(needle);
    });
  }, [rows, filter, query]);

  async function openReference(value: string) {
    const normalized = value.trim().toUpperCase();
    if (!normalized) {
      setError("Enter the Praja Acknowledgement Number.");
      return;
    }
    setLookupBusy(true);
    setError(null);
    try {
      const record = await fetchCaseByReference(normalized);
      if (!record) {
        setError("No Praja case matched that acknowledgement number.");
        return;
      }
      router.push(casePath(record.id));
    } catch {
      setError("The case store could not be reached. Try again when you are online.");
    } finally {
      setLookupBusy(false);
    }
  }

  return (
    <WorkspaceShell action={<Link className="header-action" href="/cases/new">Start an RTI case</Link>}>
      <article className="workspace-panel">
        <div className="step-body">
          <h1>My RTI cases.</h1>
          <p className="step-lede">
            Praja acknowledgements and packets you prepared. Official status exists only on the government channel that
            issued a registration number.
          </p>

          {start === "first-appeal" && (
            <p className="step-hint">
              Open the related RTI request, then choose “Start first appeal”. If you filed elsewhere, open that
              request or start from its official number on the request page.
            </p>
          )}
          {start === "second-appeal" && (
            <p className="step-hint">Open the related first appeal, then choose “Start second appeal”.</p>
          )}

          <div className="applicant-row">
            <label className="applicant-field" style={{ flex: 1 }}>
              <span className="applicant-label">Praja Acknowledgement Number</span>
              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  value={referenceInput}
                  onChange={(event) => setReferenceInput(event.target.value.toUpperCase())}
                  placeholder="PRTI/ACK/26/XXXXXXXXX"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void openReference(referenceInput);
                  }}
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void openReference(referenceInput)}
                  disabled={lookupBusy}
                >
                  {lookupBusy ? "Opening…" : "Open"}
                </button>
              </div>
            </label>
          </div>
          {error && <p className="step-error" role="alert">{error}</p>}

          {!verified && (
            <section className="applicant-verify">
              <h2>Verify your email to list cases saved against it</h2>
              <EmailVerification
                email={email}
                onEmailChange={setEmail}
                onVerified={(address) => {
                  setVerified(address);
                  void fetchCaseList(address).then(setRows);
                }}
              />
            </section>
          )}

          {reminders.length > 0 && (
            <ul className="case-reminders">
              {reminders.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}

          <div className="case-filters" role="tablist" aria-label="Filter cases">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                className={filter === item.id ? "is-active" : ""}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="applicant-field">
            <span className="applicant-label">Search</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Reference, authority, or title" />
          </label>

          {visible.length === 0 ? (
            <p className="step-hint">No cases match this view. Start a new RTI request to prepare a packet.</p>
          ) : (
            <ul className="case-list">
              {visible.map((row) => (
                <li key={row.id}>
                  <Link href={casePath(row.id)}>
                    <strong>{row.title}</strong>
                    <small>
                      {CASE_TYPE_LABEL[row.caseType as CaseType]} · {row.prajaReference}
                    </small>
                    <small>
                      {PREPARATION_LABEL[row.preparationStatus]} · {FILING_LABEL[row.filingStatus]} · {OUTCOME_LABEL[row.outcomeStatus]}
                    </small>
                    {row.pendingAction && <small>{row.pendingAction}</small>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </article>
    </WorkspaceShell>
  );
}

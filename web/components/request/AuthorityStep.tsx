"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Notes } from "@/lib/cage/schemas";
import { searchDirectory } from "@/lib/retrieval";

const DirectoryBrowser = dynamic(() => import("@/components/DirectoryBrowser"));

/* ============================================================
   Step 6. Choosing the public authority.

   Search sits at the top, because a citizen who already knows
   the office should not have to scroll past three suggestions to
   type its name. The ranked matches follow underneath as the
   fallback for everyone else.
   ============================================================ */

interface ExplainCandidate {
  id: string;
  why: string;
  caveat: string;
}

interface RetrievedPA {
  id: string;
  name: string;
  ministry: string;
  matched: string[];
  score: number;
  jurisdiction?: "central" | "state";
  directory_status?: "official-central-snapshot" | "curated-jurisdiction-rule";
  filing_channel?: string;
}

interface AuthorityStepProps {
  candidates: ExplainCandidate[];
  retrieved: RetrievedPA[];
  reviewRequired: boolean;
  notes: Notes | null;
  picked: string | null;
  onPick: (id: string) => void;
  nameOf: (id: string) => string;
  ministryOf: (id: string) => string;
  browsing: boolean;
  onToggleBrowse: () => void;
  onManualPick: (code: string, name: string, ministry: string) => void;
  error: string | null;
  onContinue: () => void;
  onBack: () => void;
}

const RANK_LABELS = ["Best match", "Second option", "Third option"];

export default function AuthorityStep({
  candidates,
  retrieved,
  reviewRequired,
  notes,
  picked,
  onPick,
  nameOf,
  ministryOf,
  browsing,
  onToggleBrowse,
  onManualPick,
  error,
  onContinue,
  onBack,
}: AuthorityStepProps) {
  const [query, setQuery] = useState("");

  const searchResults = useMemo(() => {
    if (query.trim().length < 2) return [];
    return searchDirectory(query, 6).results.map((result) => result.pa);
  }, [query]);

  const stateMatter = notes?.jurisdiction === "state";

  return (
    <div className="step-body">
      <h1>Who holds these records?</h1>
      <p className="step-lede">
        An application only works if it reaches the authority that actually keeps the file. Search for the office
        if you know it, or pick from the matches below.
      </p>

      {stateMatter && (
        <div className="verdict-card is-warning">
          <span className="verdict-tag">State or local body</span>
          <p>
            These records belong to <strong>{notes?.body_hint ?? "a State authority"}</strong>. The Central RTI
            Online portal cannot accept this application
            {notes?.filing_channel ? <>; file it through {notes.filing_channel}</> : null}.
          </p>
        </div>
      )}

      {/* --- search first --- */}
      <section className="authority-search">
        <label htmlFor="authority-query">Search for an authority</label>
        <input
          id="authority-query"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="passport office, provident fund, municipal corporation…"
          autoComplete="off"
        />

        {query.trim().length >= 2 && (
          searchResults.length > 0 ? (
            <ul className="authority-search-results">
              {searchResults.map((authority) => (
                <li key={authority.pa_code}>
                  <button
                    type="button"
                    className={picked === authority.pa_code ? "is-selected" : ""}
                    onClick={() => onManualPick(authority.pa_code, authority.name, authority.ministry)}
                  >
                    <span className="authority-search-name">{authority.name}</span>
                    <span className="authority-search-ministry">{authority.ministry}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="step-hint">Nothing matched that. Try the subject of the record instead of the office name.</p>
          )
        )}

        <button type="button" className="link-button" onClick={onToggleBrowse}>
          {browsing ? "Hide the full directory" : "Browse all ministries and authorities"}
        </button>

        {browsing && (
          <div className="authority-directory">
            <DirectoryBrowser compact selectedCode={picked} onSelect={onManualPick} />
          </div>
        )}
      </section>

      {/* --- ranked matches --- */}
      <section className="authority-matches">
        <h2>{candidates.length > 0 ? "Suggested authorities" : "No confident match"}</h2>

        {reviewRequired && candidates.length === 0 && (
          <p className="step-hint">
            Nothing matched confidently enough to suggest. Search above, or go back and describe the subject in
            more detail.
          </p>
        )}

        <ul className="authority-cards">
          {candidates.map((candidate, index) => {
            const meta = retrieved.find((item) => item.id === candidate.id);
            const selected = picked === candidate.id;
            return (
              <li key={candidate.id}>
                <button
                  type="button"
                  className={`authority-card${selected ? " is-selected" : ""}`}
                  onClick={() => onPick(candidate.id)}
                  aria-pressed={selected}
                >
                  <span className="authority-card-rank">{RANK_LABELS[index] ?? `Option ${index + 1}`}</span>
                  <span className="authority-card-name">{nameOf(candidate.id)}</span>
                  <span className="authority-card-ministry">{ministryOf(candidate.id)}</span>
                  <span className="authority-card-why">{candidate.why}</span>
                  <span className="authority-card-caveat">{candidate.caveat}</span>
                  <span className="authority-card-tags">
                    <span>
                      {meta?.directory_status === "curated-jurisdiction-rule"
                        ? "State authority"
                        : "Central directory"}
                    </span>
                    <span>{meta?.filing_channel ?? "RTI Online Central portal"}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {error && <p className="step-error" role="alert">{error}</p>}

      <div className="step-actions">
        <button type="button" className="primary-button" onClick={onContinue} disabled={!picked}>
          {picked ? `Continue with ${truncate(nameOf(picked))}` : "Choose an authority to continue"}
        </button>
        <button type="button" className="ghost-button" onClick={onBack}>Back</button>
      </div>
    </div>
  );
}

function truncate(value: string, max = 40): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

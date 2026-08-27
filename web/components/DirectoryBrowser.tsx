"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { filterDirectory, ministryGroups, type MinistryMatch } from "@/lib/directory-tree";
import { DIRECTORY, DIRECTORY_RECONCILIATION, DIRECTORY_SNAPSHOT, PORTAL_TOTAL } from "@/lib/retrieval";

/* ============================================================
   Browsable Central public authority directory. Ministries
   collapse by default: 2,900+ rows expanded at once is a wall,
   not a directory.
   ============================================================ */

interface DirectoryBrowserProps {
  /** Selection mode adds a choose button to every row. */
  onSelect?: (paCode: string, name: string, ministry: string) => void;
  selectedCode?: string | null;
  /** Compact mode drops the intro copy for use inside the drafting flow. */
  compact?: boolean;
}

const PAGE = 40;

export default function DirectoryBrowser({ onSelect, selectedCode, compact = false }: DirectoryBrowserProps) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [shown, setShown] = useState(PAGE);

  const groups = useMemo(() => ministryGroups(), []);
  const filtered: MinistryMatch[] = useMemo(() => filterDirectory(deferred), [deferred]);
  const searching = deferred.trim().length > 0;

  const resultCount = useMemo(
    () => filtered.reduce((sum, item) => sum + item.matches.length, 0),
    [filtered],
  );

  const visible = searching ? filtered.slice(0, 12) : filtered.slice(0, shown);

  function toggle(slug: string) {
    setOpen((previous) => {
      const next = new Set(previous);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  return (
    <div className="directory">
      {!compact && (
        <div className="directory-intro">
          <p>
            Every Central public authority listed on the RTI Online portal, grouped by ministry or department.
            Search by subject, office name, or authority code.
          </p>
          <dl className="directory-stats">
            <div>
              <dt>Ministries and departments</dt>
              <dd>{groups.length.toLocaleString("en-IN")}</dd>
            </div>
            <div>
              <dt>Public authorities</dt>
              <dd>{DIRECTORY.length.toLocaleString("en-IN")}</dd>
            </div>
            <div>
              <dt>Portal heading claims</dt>
              <dd>{PORTAL_TOTAL.toLocaleString("en-IN")}</dd>
            </div>
            <div>
              <dt>Snapshot taken</dt>
              <dd>{DIRECTORY_SNAPSHOT}</dd>
            </div>
          </dl>
          <details className="directory-note">
            <summary>Why the two counts differ</summary>
            <p>{DIRECTORY_RECONCILIATION}</p>
          </details>
        </div>
      )}

      <div className="directory-search">
        <label htmlFor="directory-query">Search the directory</label>
        <input
          id="directory-query"
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setShown(PAGE);
          }}
          placeholder="passport, provident fund, railways, income tax, AIIMS…"
          autoComplete="off"
        />
        <p className="directory-search-status" role="status">
          {searching
            ? `${resultCount.toLocaleString("en-IN")} ${resultCount === 1 ? "authority" : "authorities"} in ${filtered.length} ${filtered.length === 1 ? "ministry" : "ministries"}`
            : `${DIRECTORY.length.toLocaleString("en-IN")} authorities across ${groups.length} ministries`}
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="directory-empty">
          Nothing in the directory matches that. Try a broader word — the subject of the record rather than the
          name of the office.
        </p>
      ) : (
        <ul className="directory-list">
          {visible.map(({ group, matches, ministryMatched }) => {
            const expanded = searching || open.has(group.slug);
            return (
              <li key={group.slug} className="directory-group">
                <button
                  type="button"
                  className="directory-group-head"
                  aria-expanded={expanded}
                  onClick={() => toggle(group.slug)}
                >
                  <span className="directory-group-name">{group.ministry}</span>
                  <span className="directory-group-count">
                    {searching && !ministryMatched
                      ? `${matches.length} matching`
                      : `${group.total} ${group.total === 1 ? "authority" : "authorities"}`}
                  </span>
                  <span aria-hidden="true" className="directory-chevron">{expanded ? "−" : "+"}</span>
                </button>

                {expanded && (
                  <ul className="directory-authorities">
                    {group.parent && !searching && (
                      <AuthorityRow
                        code={group.parent.pa_code}
                        name={group.parent.name}
                        ministry={group.ministry}
                        isParent
                        selected={selectedCode === group.parent.pa_code}
                        onSelect={onSelect}
                      />
                    )}
                    {matches.slice(0, searching ? 25 : 400).map((authority) => (
                      <AuthorityRow
                        key={authority.pa_code}
                        code={authority.pa_code}
                        name={authority.name}
                        ministry={group.ministry}
                        selected={selectedCode === authority.pa_code}
                        onSelect={onSelect}
                      />
                    ))}
                    {searching && matches.length > 25 && (
                      <li className="directory-more">
                        {matches.length - 25} more in this ministry. Narrow the search to see them.
                      </li>
                    )}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!searching && shown < filtered.length && (
        <button type="button" className="directory-load-more" onClick={() => setShown((n) => n + PAGE)}>
          Show more ministries ({filtered.length - shown} remaining)
        </button>
      )}

      <p className="directory-boundary">
        This is a dated snapshot for reference. Confirm the authority on the official portal before filing.
        State government and local body authorities are not on this Central list.
      </p>
    </div>
  );
}

function AuthorityRow({
  code,
  name,
  ministry,
  isParent = false,
  selected = false,
  onSelect,
}: {
  code: string;
  name: string;
  ministry: string;
  isParent?: boolean;
  selected?: boolean;
  onSelect?: (paCode: string, name: string, ministry: string) => void;
}) {
  return (
    <li className={`directory-authority${isParent ? " is-parent" : ""}${selected ? " is-selected" : ""}`}>
      <span className="directory-authority-name">{name}</span>
      <span className="directory-authority-code">PA {code}</span>
      {onSelect && (
        <button type="button" onClick={() => onSelect(code, name, ministry)}>
          {selected ? "Selected" : "Choose"}
        </button>
      )}
    </li>
  );
}

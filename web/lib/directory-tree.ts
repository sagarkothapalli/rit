import { DIRECTORY, type PublicAuthority } from "@/lib/retrieval";

/* ============================================================
   Ministry-grouped view of the Central public authority
   directory. The snapshot is flat (each authority carries its
   ministry and a nesting level), so the tree is derived here
   rather than duplicated in the data file.
   ============================================================ */

export interface MinistryGroup {
  /** Ministry or department name, as printed in the directory. */
  ministry: string;
  /** Stable slug for anchors and URLs. */
  slug: string;
  /** The parent entry for the ministry itself, when the directory lists one. */
  parent: PublicAuthority | null;
  /** Every authority under the ministry, parent excluded, shallowest first. */
  authorities: PublicAuthority[];
  /** Parent plus children. */
  total: number;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function byNameAndDepth(a: PublicAuthority, b: PublicAuthority): number {
  const depth = (a.level ?? 0) - (b.level ?? 0);
  if (depth !== 0) return depth;
  return a.name.localeCompare(b.name, "en");
}

let cache: MinistryGroup[] | null = null;

/** Alphabetical ministry groups. Computed once per process. */
export function ministryGroups(): MinistryGroup[] {
  if (cache) return cache;
  const buckets = new Map<string, PublicAuthority[]>();
  for (const authority of DIRECTORY) {
    const key = authority.ministry || "Other public authorities";
    const bucket = buckets.get(key);
    if (bucket) bucket.push(authority);
    else buckets.set(key, [authority]);
  }

  cache = [...buckets.entries()]
    .map(([ministry, entries]) => {
      // The directory often lists the ministry itself as a level-0 entry with
      // the same name. Promote it so it is not shown twice as a child.
      const parentIndex = entries.findIndex(
        (entry) => (entry.level ?? 0) === 0 && entry.name.trim() === ministry.trim(),
      );
      const parent = parentIndex >= 0 ? entries[parentIndex] : null;
      const authorities = entries
        .filter((_, index) => index !== parentIndex)
        .sort(byNameAndDepth);
      return {
        ministry,
        slug: slugify(ministry),
        parent,
        authorities,
        total: authorities.length + (parent ? 1 : 0),
      };
    })
    .sort((a, b) => a.ministry.localeCompare(b.ministry, "en"));
  return cache;
}

export interface DirectoryStats {
  ministries: number;
  authorities: number;
}

export function directoryStats(): DirectoryStats {
  return { ministries: ministryGroups().length, authorities: DIRECTORY.length };
}

export interface MinistryMatch {
  group: MinistryGroup;
  /** Authorities within the group that matched, or all of them for a ministry-name match. */
  matches: PublicAuthority[];
  /** True when the query matched the ministry name rather than an authority. */
  ministryMatched: boolean;
}

/**
 * Plain substring filter across ministry name, authority name, and keywords.
 * Deliberately not the BM25 ranker used for routing: browsing a directory
 * wants predictable "contains" behaviour, not relevance scoring.
 */
export function filterDirectory(query: string): MinistryMatch[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return ministryGroups().map((group) => ({ group, matches: group.authorities, ministryMatched: false }));

  const out: MinistryMatch[] = [];
  for (const group of ministryGroups()) {
    const ministryMatched = group.ministry.toLowerCase().includes(needle);
    const matches = group.authorities.filter((authority) =>
      authority.name.toLowerCase().includes(needle)
      || authority.pa_code === needle
      || authority.keywords.some((keyword) => keyword.toLowerCase().includes(needle)),
    );
    if (ministryMatched || matches.length > 0) {
      out.push({
        group,
        matches: ministryMatched && matches.length === 0 ? group.authorities : matches,
        ministryMatched,
      });
    }
  }
  return out;
}

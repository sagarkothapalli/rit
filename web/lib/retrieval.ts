import directoryFile from "@/data/rti-authorities.json";

export interface PublicAuthority {
  pa_code: string;
  name: string;
  ministry: string;
  keywords: string[];
  level?: number;
  boost?: boolean;
}

interface DirectoryFile {
  snapshot: string;
  source: string;
  portal_total: number;
  count: number;
  label: string;
  authorities: PublicAuthority[];
}

const FILE = directoryFile as DirectoryFile;

export const DIRECTORY_SNAPSHOT = FILE.snapshot;
export const DIRECTORY_SOURCE = FILE.source;
export const PORTAL_TOTAL = FILE.portal_total;
export const DIRECTORY: PublicAuthority[] = FILE.authorities;
export const DIRECTORY_LABEL = FILE.label;

/** Hints that the subject is a State/State-body matter — the Central portal cannot take it. */
const STATE_HINTS = [
  "municipal", "nagar nigam", "nagar palika", "municipality", "corporation ward",
  "state police", "state road", "city bus", "state transport", "roadways",
  "panchayat", "block office", "district collector", "dm office", "sdm",
  "bijli board", "electricity board", "discom", "state electricity",
  "state university", "state board exam", "state exam",
  "safai", "sewer", "drainage", "ward councillor", "mla", "vidhan sabha",
  "state water board", "jal board", "state hospital", "district hospital",
  "tehsil", "patwari", "land record", "registry", "registrar land",
];

export function looksStateMatter(text: string): boolean {
  const t = text.toLowerCase();
  return STATE_HINTS.some((h) => t.includes(h));
}

const STOP = new Set([
  "the", "a", "an", "and", "or", "of", "for", "to", "in", "on", "at", "is", "are",
  "was", "were", "my", "our", "i", "we", "you", "it", "this", "that", "with",
  "please", "provide", "give", "want", "need", "about", "from", "by", "be",
  "hai", "hain", "ka", "ki", "ke", "ko", "me", "mein", "se", "par", "bhai",
  "certified", "copies", "copy", "records", "record", "relating", "described",
  "official", "matter", "file", "files", "processing", "application", "pending",
  "status", "office", "reports", "report", "details", "related", "regarding",
  "delay", "delays", "monitoring", "section", "without", "including", "listed",
  "notings", "correspondence", "responsible", "officials", "names", "designations",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOP.has(t));
}

const FIELD_OFFICE = /\b(piu[- ]|e\/i\b|embassy|high commission|consulate|regional office|field (unit|office)|circle office|division office|branch office|sub[- ]division|project implementation)\b/i;

function isFieldOffice(pa: PublicAuthority): boolean {
  if ((pa.level ?? 0) >= 2 || FIELD_OFFICE.test(pa.name)) return true;
  if (/external affairs/i.test(pa.ministry)) {
    const n = pa.name.trim();
    if (n.split(/\s+/).length <= 2 && !/passport|visa|consular|cpv|mea|external/i.test(n)) return true;
  }
  return false;
}

interface IndexedDoc {
  pa: PublicAuthority;
  kw: string[];
  text: string[];
  rawName: string;
}

const INDEX: IndexedDoc[] = DIRECTORY.map((pa) => {
  const kw = pa.keywords.map((k) => k.toLowerCase());
  return {
    pa,
    kw,
    text: tokenize(`${pa.name} ${pa.ministry} ${kw.join(" ")}`),
    rawName: `${pa.name} ${pa.ministry}`.toLowerCase(),
  };
});

const N = INDEX.length;
const AVG_LEN = INDEX.reduce((s, d) => s + d.text.length, 0) / Math.max(N, 1);

export interface ScoredDoc {
  pa: PublicAuthority;
  score: number;
  matched: string[];
}

/**
 * BM25 over (name + ministry + keywords) with an exact-keyword hit bonus.
 * Field offices are down-ranked unless the query names them. Curated topic
 * overlays (boost) are up-ranked. The LLM never invents an authority: it only
 * ranks a shortlist this function already retrieved.
 */
export function searchDirectory(query: string, topK = 3): { results: ScoredDoc[]; reviewRequired: boolean } {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return { results: [], reviewRequired: true };

  const df = new Map<string, number>();
  for (const t of new Set(qTokens)) {
    df.set(t, INDEX.filter((d) => d.text.includes(t)).length);
  }

  const k1 = 1.5;
  const b = 0.75;
  const scored: ScoredDoc[] = INDEX.map((d) => {
    let score = 0;
    const matched = new Set<string>();
    for (const t of qTokens) {
      const f = d.text.filter((x) => x === t).length;
      if (f === 0) continue;
      matched.add(t);
      const idf = Math.log(1 + (N - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));
      score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + b * (d.text.length / AVG_LEN))));
    }
    for (const kw of d.kw) {
      if (kw.includes(" ") && qTokens.join(" ").includes(kw)) {
        score += 4;
        kw.split(" ").forEach((w) => matched.add(w));
      }
    }
    for (const t of qTokens) {
      if (d.rawName.includes(t) && t.length > 3) {
        score += 1.5;
        matched.add(t);
      }
    }
    if (d.pa.boost) score *= 1.4;
    if (isFieldOffice(d.pa)) {
      const named = qTokens.some((t) => t.length > 3 && d.rawName.includes(t) && !["india", "national", "authority"].includes(t));
      if (!named) score *= 0.32;
    }
    return { pa: d.pa, score, matched: [...matched] };
  });

  scored.sort((a, b2) => b2.score - a.score);
  const positive = scored.filter((s) => s.score > 0);
  const results = positive.slice(0, topK);
  const reviewRequired = !results.length || results[0].score < 0.9;
  return { results, reviewRequired };
}

/** Retrieve a pool of up to `pool` authorities, then keep enough for three predictions. */
export function shortlistDirectory(query: string, pool = 16): { results: ScoredDoc[]; reviewRequired: boolean } {
  const { results: ranked, reviewRequired } = searchDirectory(query, Math.max(pool * 2, 32));
  if (ranked.length === 0) return { results: [], reviewRequired: true };

  const top = ranked[0];
  let results = ranked;
  if (top.score >= 3) {
    const ministry = top.pa.ministry;
    const same = ranked
      .filter((r) => r.pa.ministry === ministry)
      .sort((a, b2) => Number(isFieldOffice(a.pa)) - Number(isFieldOffice(b2.pa)) || b2.score - a.score);
    const otherStrong = ranked.filter((r) => r.pa.ministry !== ministry && (r.pa.boost || r.score >= top.score * 0.2));
    const merged: ScoredDoc[] = [];
    const have = new Set<string>();
    for (const item of [...same, ...otherStrong, ...ranked]) {
      if (have.has(item.pa.pa_code)) continue;
      have.add(item.pa.pa_code);
      merged.push(item);
      if (merged.length >= pool) break;
    }
    results = merged;
  } else {
    results = ranked.slice(0, pool);
  }

  const parent = INDEX.find(
    (d) => d.pa.level === 0 && d.pa.name === results[0].pa.ministry && d.pa.pa_code !== results[0].pa.pa_code
  );
  if (parent && !results.some((r) => r.pa.pa_code === parent.pa.pa_code)) {
    results = [results[0], { pa: parent.pa, score: Math.max(results[0].score * 0.35, 1), matched: [] }, ...results.slice(1)];
  }

  const head = results[0];
  const restCore = results.slice(1).filter((r) => !isFieldOffice(r.pa));
  const restField = results.slice(1).filter((r) => isFieldOffice(r.pa));
  results = [head, ...restCore, ...restField];

  if (results.length < 3) {
    const ministry = results[0].pa.ministry;
    const have = new Set(results.map((r) => r.pa.pa_code));
    for (const doc of INDEX) {
      if (results.length >= 3) break;
      if (have.has(doc.pa.pa_code)) continue;
      if (doc.pa.ministry !== ministry && !doc.pa.boost) continue;
      results.push({ pa: doc.pa, score: 0.15, matched: [] });
      have.add(doc.pa.pa_code);
    }
  }
  return { results: results.slice(0, pool), reviewRequired };
}

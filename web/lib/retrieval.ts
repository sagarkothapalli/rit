import directoryFile from "@/data/rti-authorities.json";
import { LOCAL_BODIES, classifyJurisdiction } from "@/lib/jurisdiction";

export interface PublicAuthority {
  pa_code: string;
  name: string;
  ministry: string;
  keywords: string[];
  level?: number;
  boost?: boolean;
  jurisdiction?: "central" | "state";
  directory_status?: "official-central-snapshot" | "curated-jurisdiction-rule";
  filing_channel?: string;
}

interface DirectoryFile {
  snapshot: string;
  source: string;
  portal_total: number;
  count: number;
  raw_row_count?: number;
  duplicate_id_rows?: number;
  reconciliation_note?: string;
  label: string;
  authorities: PublicAuthority[];
}

const FILE = directoryFile as DirectoryFile;

export const DIRECTORY_SNAPSHOT = FILE.snapshot;
export const DIRECTORY_SOURCE = FILE.source;
export const PORTAL_TOTAL = FILE.portal_total;
export const DIRECTORY: PublicAuthority[] = FILE.authorities;
export const DIRECTORY_LABEL = FILE.label;
export const DIRECTORY_RAW_ROWS = FILE.raw_row_count ?? FILE.count;
export const DIRECTORY_DUPLICATE_ID_ROWS = FILE.duplicate_id_rows ?? 0;
export const DIRECTORY_RECONCILIATION = FILE.reconciliation_note
  ?? `The snapshot contains ${FILE.count.toLocaleString("en-IN")} unique identifiers; the portal heading claims ${FILE.portal_total.toLocaleString("en-IN")}.`;

/**
 * Jurisdiction rules are kept outside the Central portal count. They prevent a
 * famous State road or body from being confidently mislabelled as NHAI merely
 * because the transcript contains "expressway". These records are visibly
 * labelled in the UI and never presented as RTI Online directory entries.
 */
export const JURISDICTION_AUTHORITIES: PublicAuthority[] = [
  {
    pa_code: "STATE-MSRDC",
    name: "Maharashtra State Road Development Corporation (MSRDC)",
    ministry: "Government of Maharashtra",
    keywords: [
      "msrdc", "mumbai pune", "mumbai-pune expressway", "yashwantrao chavan expressway",
      "toll", "toll collection", "expressway repair", "maharashtra road", "road maintenance",
    ],
    level: 0,
    boost: true,
    jurisdiction: "state",
    directory_status: "curated-jurisdiction-rule",
    filing_channel: "Maharashtra state RTI channel",
  },
  /**
   * Urban local bodies. A ward road, drain, or street light belongs
   * here, never to a Central authority. Registering them as retrievable
   * records holders means the citizen still gets a complete, correctly
   * addressed application instead of a dead end.
   */
  ...LOCAL_BODIES.map((body): PublicAuthority => ({
    pa_code: body.pa_code,
    name: body.name,
    ministry: `Government of ${body.state}`,
    keywords: [
      ...body.aliases,
      ...(body.keywords ?? []),
      "municipal corporation", "ward", "local body",
      "road maintenance", "colony road", "ward road", "drainage", "sewerage",
      "street light", "sanitation", "solid waste", "property tax",
      "work order", "contractor", "sanctioned budget", "tender",
    ],
    level: 0,
    boost: true,
    jurisdiction: "state",
    directory_status: "curated-jurisdiction-rule",
    filing_channel: `${body.short} Public Information Officer (${body.state} State RTI channel)`,
  })),
];

/**
 * Hints that the subject is a State/State-body matter — the Central portal
 * cannot take it. Kept as a fast substring pass; the authoritative decision
 * lives in `lib/jurisdiction.ts`, which this function defers to.
 */
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
  if (STATE_HINTS.some((h) => t.includes(h))) return true;
  return classifyJurisdiction(text).level === "state";
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
  tf: Map<string, number>;
}

const LOCAL_BODY_CODES = new Set(LOCAL_BODIES.map((body) => body.pa_code));

const INDEX: IndexedDoc[] = [...JURISDICTION_AUTHORITIES, ...DIRECTORY].map((pa) => {
  const kw = pa.keywords.map((k) => k.toLowerCase());
  const text = tokenize(`${pa.name} ${pa.ministry} ${kw.join(" ")}`);
  const tf = new Map<string, number>();
  for (const token of text) tf.set(token, (tf.get(token) ?? 0) + 1);
  return {
    pa,
    kw,
    text,
    rawName: `${pa.name} ${pa.ministry}`.toLowerCase(),
    tf,
  };
});

const POSTINGS = new Map<string, number[]>();
INDEX.forEach((doc, index) => {
  for (const token of doc.tf.keys()) {
    const list = POSTINGS.get(token);
    if (list) list.push(index);
    else POSTINGS.set(token, [index]);
  }
});

const N = INDEX.length;
const AVG_LEN = INDEX.reduce((s, d) => s + d.text.length, 0) / Math.max(N, 1);
const MSRDC_QUERY = /\b(mumbai\s*[-–—]?\s*pune|pune\s*[-–—]?\s*mumbai)\b/i;

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
 *
 * Local bodies are gated by the jurisdiction verdict rather than by keywords:
 * exactly the one municipal corporation the citizen's own city maps to is
 * eligible, and none of them survive a Central subject like a passport delay.
 */
export function searchDirectory(query: string, topK = 3): { results: ScoredDoc[]; reviewRequired: boolean } {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return { results: [], reviewRequired: true };

  const verdict = classifyJurisdiction(query);
  const anchorCode = verdict.level === "state" ? verdict.localBody?.pa_code : undefined;

  const uniqueTokens = [...new Set(qTokens)];
  const df = new Map<string, number>();
  const candidate = new Set<number>();
  for (const token of uniqueTokens) {
    const posting = POSTINGS.get(token);
    df.set(token, posting?.length ?? 0);
    if (posting) for (const index of posting) candidate.add(index);
  }
  if (anchorCode) {
    const anchor = INDEX.findIndex((doc) => doc.pa.pa_code === anchorCode);
    if (anchor >= 0) candidate.add(anchor);
  }
  if (MSRDC_QUERY.test(query)) {
    const msrdc = INDEX.findIndex((doc) => doc.pa.pa_code === "STATE-MSRDC");
    if (msrdc >= 0) candidate.add(msrdc);
  }

  const k1 = 1.5;
  const b = 0.75;
  const joined = qTokens.join(" ");
  const scored: ScoredDoc[] = [];
  for (const index of candidate) {
    const d = INDEX[index];
    let score = 0;
    const matched = new Set<string>();
    for (const t of qTokens) {
      const f = d.tf.get(t) ?? 0;
      if (f === 0) continue;
      matched.add(t);
      const idf = Math.log(1 + (N - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));
      score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + b * (d.text.length / AVG_LEN))));
    }
    for (const kw of d.kw) {
      if (kw.includes(" ") && joined.includes(kw)) {
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
    if (d.pa.pa_code === "STATE-MSRDC" && MSRDC_QUERY.test(query)) {
      score += 18;
      matched.add("mumbai-pune corridor");
    }
    if (LOCAL_BODY_CODES.has(d.pa.pa_code)) {
      // Only the citizen's own local body competes, and never against a
      // Central subject — otherwise every city matches "road maintenance".
      if (d.pa.pa_code === anchorCode) {
        score += 22;
        matched.add("local body jurisdiction");
      } else {
        score = 0;
      }
    } else if (d.pa.jurisdiction === "state" && verdict.level === "central") {
      score *= 0.05;
    }
    if (isFieldOffice(d.pa)) {
      const named = qTokens.some((t) => t.length > 3 && d.rawName.includes(t) && !["india", "national", "authority"].includes(t));
      if (!named) score *= 0.32;
    }
    scored.push({ pa: d.pa, score, matched: [...matched] });
  }

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
      // Never pad with an unrelated city's municipal corporation.
      if (LOCAL_BODY_CODES.has(doc.pa.pa_code)) continue;
      if (doc.pa.ministry !== ministry && !doc.pa.boost) continue;
      results.push({ pa: doc.pa, score: 0.15, matched: [] });
      have.add(doc.pa.pa_code);
    }
  }
  return { results: results.slice(0, pool), reviewRequired };
}

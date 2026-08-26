import directory from "@/data/mock-directory.json";

export interface PublicAuthority {
  pa_code: string;
  name: string;
  ministry: string;
  keywords: string[];
}

export const DIRECTORY_SNAPSHOT = "2026-08-26";
export const DIRECTORY: PublicAuthority[] = directory;

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
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOP.has(t));
}

interface ScoredDoc {
  pa: PublicAuthority;
  score: number;
  matched: string[];
}

/**
 * BM25 over (name + ministry + keywords) with an exact-keyword hit bonus.
 * Pure code — the LLM never selects candidates, it only explains them.
 */
export function searchDirectory(query: string, topK = 3): { results: ScoredDoc[]; reviewRequired: boolean } {
  const qTokens = tokenize(query);
  const docs = DIRECTORY.map((pa) => {
    const kw = pa.keywords.map((k) => k.toLowerCase());
    return {
      pa,
      kw,
      text: tokenize(`${pa.name} ${pa.ministry} ${kw.join(" ")}`),
      rawName: `${pa.name} ${pa.ministry}`.toLowerCase(),
      rawKw: kw.join(" | "),
    };
  });

  const N = docs.length;
  const avgLen = docs.reduce((s, d) => s + d.text.length, 0) / N;
  const df = new Map<string, number>();
  for (const t of new Set(qTokens)) {
    df.set(t, docs.filter((d) => d.text.includes(t)).length);
  }

  const k1 = 1.5;
  const b = 0.75;
  const scored: ScoredDoc[] = docs.map((d) => {
    let score = 0;
    const matched = new Set<string>();
    for (const t of qTokens) {
      const f = d.text.filter((x) => x === t).length;
      if (f === 0) continue;
      matched.add(t);
      const idf = Math.log(1 + (N - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));
      score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + b * (d.text.length / avgLen))));
    }
    // Exact multi-word keyword hits are strong evidence.
    for (const kw of d.kw) {
      if (kw.includes(" ") && qTokens.join(" ").includes(kw)) {
        score += 4;
        kw.split(" ").forEach((w) => matched.add(w));
      }
    }
    // Direct name mention is stronger still.
    for (const t of qTokens) {
      if (d.rawName.includes(t) && t.length > 3) {
        score += 1.5;
        matched.add(t);
      }
    }
    return { pa: d.pa, score, matched: [...matched] };
  });

  scored.sort((a, b2) => b2.score - a.score);
  const results = scored.filter((s) => s.score > 0).slice(0, topK);
  const reviewRequired = !results.length || results[0].score < 1.2;
  return { results, reviewRequired };
}

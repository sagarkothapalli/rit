import { chatBodyExtras, DEEPSEEK_BASE_URL } from "@/lib/cage/models";
import {
  notesPrompt,
  wrapUntrusted,
  draftPrompt,
  explainPrompt,
} from "@/lib/cage/prompts";
import {
  NotesSchema,
  DraftSchema,
  ExplainSchema,
  explainFallback,
  bplVerificationFallback,
  type Notes,
  type Draft,
  type GateResult,
  type IntakeHints,
} from "@/lib/cage/schemas";
import { normalizeNotes, routingQuery } from "@/lib/intake";
import {
  shortlistDirectory,
  DIRECTORY,
  DIRECTORY_SNAPSHOT,
  PORTAL_TOTAL,
} from "@/lib/retrieval";

const HOSTED_MODEL = "deepseek-v4-flash";
const LLM_PATH = "/api/llm";

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("LLM non-JSON output");
  }
}

async function callHostedJSON<T>(
  system: string,
  user: string,
  maxTokens: number,
  validate: (x: unknown) => T
): Promise<T> {
  const res = await fetch(LLM_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: HOSTED_MODEL,
      temperature: 0,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      ...chatBodyExtras(HOSTED_MODEL, DEEPSEEK_BASE_URL),
    }),
  });
  if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM empty content");
  return validate(extractJson(content));
}

export async function hostedNotes(
  transcript: string,
  lang: string,
  intake?: IntakeHints,
): Promise<GateResult<Notes>> {
  const shape = `{
  "records_sought": string[],
  "date_range": string | null,
  "place": string | null,
  "body_hint": string | null,
  "format": "certified copies" | "inspection" | "electronic copies" | "samples" | "unspecified",
  "missing_essentials": [],
  "is_state_matter": boolean,
  "state_name": string | null
}`;
  const { system, user } = notesPrompt(wrapUntrusted(transcript, lang), shape);
  const raw = await callHostedJSON(system, user, 700, (x) => NotesSchema.parse(x));
  // normalizeNotes() applies the deterministic jurisdiction verdict.
  return {
    mode: "LIVE",
    model: HOSTED_MODEL,
    data: NotesSchema.parse(normalizeNotes(transcript, raw, intake)),
  };
}

export async function hostedDraft(notes: Notes): Promise<GateResult<Draft>> {
  const shape = `{
  "title": string,
  "background": string,
  "requests": string[]
}`;
  const { system, user } = draftPrompt(JSON.stringify(notes), shape);
  const data = await callHostedJSON(system, user, 1400, (x) => DraftSchema.parse(x));
  return { mode: "LIVE", model: HOSTED_MODEL, data };
}

export async function hostedExplain(input: {
  notes: Notes;
  transcript?: string;
  draft?: Draft;
}): Promise<unknown> {
  const query = routingQuery(input);
  const { results, reviewRequired } = shortlistDirectory(query, 16);
  const directory = {
    snapshot: DIRECTORY_SNAPSHOT,
    count: DIRECTORY.length,
    portal_total: PORTAL_TOTAL,
    shortlist: Math.min(16, results.length),
  };
  const retrieved = results.map((r) => ({
    id: r.pa.pa_code,
    name: r.pa.name,
    ministry: r.pa.ministry,
    matched: r.matched.slice(0, 6),
    score: Math.round(r.score * 100) / 100,
  }));
  if (retrieved.length === 0) {
    return { mode: "LIVE", directory, review_required: true, retrieved: [], data: { candidates: [] } };
  }
  const shape = `{
  "candidates": [ { "id": string, "why": string, "caveat": string } ]
}`;
  const { system, user } = explainPrompt(JSON.stringify(input.notes), JSON.stringify(retrieved), shape);
  const parsed = await callHostedJSON(system, user, 700, (x) => ExplainSchema.parse(x));
  const byId = new Map(retrieved.map((r) => [r.id, r]));
  const fallback = explainFallback(retrieved).candidates;
  const valid = parsed.candidates.filter((c) => byId.has(c.id));
  const seen = new Set(valid.map((c) => c.id));
  const padded = [...valid];
  for (const item of retrieved) {
    if (padded.length >= 3) break;
    if (seen.has(item.id)) continue;
    const extra = fallback.find((c) => c.id === item.id);
    padded.push(extra ?? { id: item.id, why: `Directory match for ${item.name}.`, caveat: "Confirm this authority holds the records before filing." });
    seen.add(item.id);
  }
  const ranked = padded.slice(0, 3);
  const rankedIds = new Set(ranked.map((c) => c.id));
  const rankedRetrieved = [
    ...ranked.map((c) => byId.get(c.id)!).filter(Boolean),
    ...retrieved.filter((r) => !rankedIds.has(r.id)),
  ].slice(0, 3);
  return {
    mode: "LIVE",
    model: HOSTED_MODEL,
    data: { candidates: ranked },
    directory,
    review_required: reviewRequired && ranked.length === 0,
    retrieved: rankedRetrieved,
  };
}

export async function hostedGate(url: string, body: unknown): Promise<unknown> {
  if (url.endsWith("/notes")) {
    const request = body as { transcript?: string; lang?: string; intake?: IntakeHints };
    return hostedNotes(request.transcript ?? "", request.lang ?? "en-IN", request.intake);
  }
  if (url.endsWith("/draft")) {
    const request = body as { notes: Notes };
    return hostedDraft(request.notes);
  }
  if (url.endsWith("/explain")) {
    const request = body as { notes: Notes; transcript?: string; draft?: Draft };
    return hostedExplain(request);
  }
  if (url.endsWith("/verify-bpl")) {
    const request = body as { fileName?: string; fileType?: string; fileSize?: number; fileBase64?: string };
    const data = bplVerificationFallback(request.fileName ?? "document");
    return { mode: "SIMULATED", data };
  }
  throw new Error("Unknown gate");
}

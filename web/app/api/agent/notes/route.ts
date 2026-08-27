import { NextResponse } from "next/server";
import { NotesRequest, NotesSchema, notesFallback, type GateResult, type Notes } from "@/lib/cage/schemas";
import { callModelJSON, getModelConfig } from "@/lib/cage/client";
import { notesPrompt, wrapUntrusted } from "@/lib/cage/prompts";
import { looksStateMatter } from "@/lib/retrieval";
import { normalizeNotes } from "@/lib/intake";
import { clientKey, rateLimit } from "@/lib/cage/ratelimit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "notes"));
  if (!rl.ok) {
    return NextResponse.json({ error: "RATE_LIMITED", retryAfter: rl.retryAfter }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }
  const parsed = NotesRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }
  const { transcript, lang, intake } = parsed.data;

  // Code-side state hint is always applied, model or not.
  const stateHint = looksStateMatter(transcript);

  function finish(raw: Notes, mode: "LIVE" | "SIMULATED", model?: string) {
    const normalized = normalizeNotes(transcript, raw, intake);
    const data = NotesSchema.parse({
      ...normalized,
      is_state_matter: normalized.is_state_matter || stateHint,
    });
    const result: GateResult<Notes> = { mode, model, data };
    return NextResponse.json(result);
  }

  const cfg = await getModelConfig();
  if (!cfg) {
    return finish(notesFallback(transcript), "SIMULATED");
  }

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
  const res = await callModelJSON({ cfg, model: cfg.fast, system, user, maxTokens: 700 }, (x) =>
    NotesSchema.parse(x)
  );

  if (!res.ok) {
    return finish(notesFallback(transcript), "SIMULATED");
  }

  return finish(res.data, "LIVE", res.model);
}

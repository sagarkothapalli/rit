import { NextResponse } from "next/server";
import { NotesRequest, NotesSchema, notesFallback, type GateResult, type Notes } from "@/lib/cage/schemas";
import { callModelJSON, getModelConfig } from "@/lib/cage/client";
import { notesPrompt, wrapUntrusted } from "@/lib/cage/prompts";
import { normalizeNotes } from "@/lib/intake";
import { modelGuard } from "@/lib/cage/ratelimit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const blocked = modelGuard(req, "notes");
  if (blocked) return blocked;

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

  function finish(raw: Notes, mode: "LIVE" | "SIMULATED", model?: string) {
    // normalizeNotes() owns the jurisdiction verdict: it runs the
    // deterministic classifier over the transcript and the agent's hints, so
    // the model cannot talk a ward road into being a Central matter.
    const normalized = normalizeNotes(transcript, raw, intake);
    const data = NotesSchema.parse(normalized);
    const result: GateResult<Notes> = { mode, model, data };
    return NextResponse.json(result);
  }

  const cfg = await getModelConfig();
  if (!cfg) {
    return finish(notesFallback(transcript), "SIMULATED");
  }

  const shape = `{
  "valid_for_rti": boolean,
  "refusal_reason": string | null,
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

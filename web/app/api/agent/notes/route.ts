import { NextResponse } from "next/server";
import type { z } from "zod";
import { NotesRequest, NotesSchema, notesFallback, type GateResult } from "@/lib/cage/schemas";
import { callModelJSON, getModelConfig } from "@/lib/cage/client";
import { notesPrompt, wrapUntrusted } from "@/lib/cage/prompts";
import { looksStateMatter } from "@/lib/retrieval";
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
  const { transcript, lang } = parsed.data;

  // Code-side state hint is always applied, model or not.
  const stateHint = looksStateMatter(transcript);

  const cfg = await getModelConfig();
  if (!cfg) {
    const result: GateResult<z.infer<typeof NotesSchema>> = {
      mode: "SIMULATED",
      data: { ...notesFallback(transcript), is_state_matter: stateHint || notesFallback(transcript).is_state_matter },
    };
    return NextResponse.json(result);
  }

  const shape = `{
  "records_sought": string[],
  "date_range": string | null,
  "place": string | null,
  "body_hint": string | null,
  "format": "certified copies" | "inspection" | "electronic copies" | "samples" | "unspecified",
  "missing_essentials": ("records_sought" | "date_range" | "place" | "body_hint" | "format")[],
  "is_state_matter": boolean,
  "state_name": string | null
}`;

  const { system, user } = notesPrompt(wrapUntrusted(transcript, lang), shape);
  const res = await callModelJSON({ cfg, model: cfg.fast, system, user, maxTokens: 600 }, (x) =>
    NotesSchema.parse(x)
  );

  if (!res.ok) {
    const result: GateResult<z.infer<typeof NotesSchema>> = {
      mode: "SIMULATED",
      data: { ...notesFallback(transcript), is_state_matter: stateHint || notesFallback(transcript).is_state_matter },
    };
    return NextResponse.json(result);
  }

  const data = res.data;
  data.is_state_matter = stateHint || data.is_state_matter;
  const result: GateResult<z.infer<typeof NotesSchema>> = { mode: "LIVE", model: res.model, data };
  return NextResponse.json(result);
}

import { NextResponse } from "next/server";
import type { z } from "zod";
import { ExplainRequest, ExplainSchema, explainFallback, type GateResult } from "@/lib/cage/schemas";
import { callModelJSON, getModelConfig } from "@/lib/cage/client";
import { explainPrompt } from "@/lib/cage/prompts";
import { DIRECTORY_SNAPSHOT, searchDirectory } from "@/lib/retrieval";
import { clientKey, rateLimit } from "@/lib/cage/ratelimit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "explain"));
  if (!rl.ok) {
    return NextResponse.json({ error: "RATE_LIMITED", retryAfter: rl.retryAfter }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }
  const parsed = ExplainRequest.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  const notes = parsed.data.notes;

  // Retrieval is pure code. The model never chooses candidates.
  const query = [
    ...notes.records_sought,
    notes.body_hint ?? "",
    notes.place ?? "",
  ].join(" ");
  const { results, reviewRequired } = searchDirectory(query, 3);

  if (reviewRequired || results.length === 0) {
    return NextResponse.json({
      mode: "SIMULATED" as const,
      directory: { snapshot: DIRECTORY_SNAPSHOT, count: 74 },
      review_required: true,
      candidates: [],
    });
  }

  const retrieved = results.map((r) => ({
    id: r.pa.pa_code,
    name: r.pa.name,
    ministry: r.pa.ministry,
    matched: r.matched.slice(0, 6),
    score: Math.round(r.score * 100) / 100,
  }));

  const cfg = await getModelConfig();
  if (!cfg) {
    const result: GateResult<z.infer<typeof ExplainSchema>> = {
      mode: "SIMULATED",
      data: explainFallback(retrieved),
    };
    return NextResponse.json({ ...result, directory: { snapshot: DIRECTORY_SNAPSHOT, count: 74 }, review_required: false, retrieved });
  }

  const shape = `{
  "candidates": [ { "id": string, "why": string, "caveat": string } ]  // same order, same ids as input, max 3
}`;

  const { system, user } = explainPrompt(JSON.stringify(notes), JSON.stringify(retrieved), shape);
  const res = await callModelJSON({ cfg, model: cfg.fast, system, user, maxTokens: 500 }, (x) =>
    ExplainSchema.parse(x)
  );

  // Union by id — the model can only annotate retrieved candidates, never add one.
  let explanations: z.infer<typeof ExplainSchema>["candidates"] = explainFallback(retrieved).candidates;
  if (res.ok) {
    const byId = new Map(retrieved.map((r) => [r.id, r]));
    const valid = res.data.candidates.filter((c) => byId.has(c.id)).slice(0, 3);
    if (valid.length === retrieved.length) explanations = valid;
  }

  const result: GateResult<z.infer<typeof ExplainSchema>> = {
    mode: res.ok ? "LIVE" : "SIMULATED",
    model: res.ok ? res.model : undefined,
    data: { candidates: explanations },
  };
  return NextResponse.json({ ...result, directory: { snapshot: DIRECTORY_SNAPSHOT, count: 74 }, review_required: false, retrieved });
}

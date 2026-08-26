import { NextResponse } from "next/server";
import type { z } from "zod";
import { ExplainRequest, ExplainSchema, explainFallback, type GateResult } from "@/lib/cage/schemas";
import { callModelJSON, getModelConfig } from "@/lib/cage/client";
import { explainPrompt } from "@/lib/cage/prompts";
import { DIRECTORY, DIRECTORY_SNAPSHOT, PORTAL_TOTAL, shortlistDirectory } from "@/lib/retrieval";
import { routingQuery } from "@/lib/intake";
import { clientKey, rateLimit } from "@/lib/cage/ratelimit";

export const dynamic = "force-dynamic";

const POOL = 16;

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
  const { notes, transcript, draft } = parsed.data;

  const query = routingQuery({ transcript, notes, draft });
  const { results, reviewRequired } = shortlistDirectory(query, POOL);

  const directoryMeta = {
    snapshot: DIRECTORY_SNAPSHOT,
    count: DIRECTORY.length,
    portal_total: PORTAL_TOTAL,
    shortlist: Math.min(POOL, results.length),
  };

  if (results.length === 0) {
    return NextResponse.json({
      mode: "SIMULATED" as const,
      directory: directoryMeta,
      review_required: true,
      retrieved: [],
      data: { candidates: [] },
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
  const fallback = explainFallback(retrieved);
  if (!cfg) {
    const result: GateResult<z.infer<typeof ExplainSchema>> = { mode: "SIMULATED", data: fallback };
    return NextResponse.json({
      ...result,
      directory: directoryMeta,
      review_required: reviewRequired,
      retrieved: retrieved.slice(0, 3),
    });
  }

  const shape = `{
  "candidates": [ { "id": string, "why": string, "caveat": string } ]  // exactly 3, best first, ids from the shortlist only
}`;

  const { system, user } = explainPrompt(JSON.stringify(notes), JSON.stringify(retrieved), shape);
  const res = await callModelJSON({ cfg, model: cfg.fast, system, user, maxTokens: 700 }, (x) =>
    ExplainSchema.parse(x)
  );

  const byId = new Map(retrieved.map((r) => [r.id, r]));
  let ranked = fallback.candidates;
  if (res.ok) {
    const valid = res.data.candidates.filter((c) => byId.has(c.id));
    const seen = new Set(valid.map((c) => c.id));
    const padded = [...valid];
    for (const item of retrieved) {
      if (padded.length >= 3) break;
      if (seen.has(item.id)) continue;
      const extra = fallback.candidates.find((c) => c.id === item.id);
      padded.push(extra ?? { id: item.id, why: `Directory match for ${item.name}.`, caveat: "Confirm this authority holds the records before filing." });
      seen.add(item.id);
    }
    if (padded.length) ranked = padded.slice(0, 3);
  }

  const rankedIds = new Set(ranked.map((c) => c.id));
  const rankedRetrieved = [
    ...ranked.map((c) => byId.get(c.id)!).filter(Boolean),
    ...retrieved.filter((r) => !rankedIds.has(r.id)),
  ].slice(0, 3);

  const result: GateResult<z.infer<typeof ExplainSchema>> = {
    mode: res.ok ? "LIVE" : "SIMULATED",
    model: res.ok ? res.model : undefined,
    data: { candidates: ranked },
  };
  return NextResponse.json({
    ...result,
    directory: directoryMeta,
    review_required: reviewRequired && ranked.length === 0,
    retrieved: rankedRetrieved,
  });
}

import { NextResponse } from "next/server";
import type { z } from "zod";
import { GuardRequest, GuardSchema, guardFallback, type GateResult } from "@/lib/cage/schemas";
import { callModelJSON, getModelConfig } from "@/lib/cage/client";
import { guardPrompt } from "@/lib/cage/prompts";
import { clientKey, rateLimit } from "@/lib/cage/ratelimit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "guard"));
  if (!rl.ok) {
    return NextResponse.json({ error: "RATE_LIMITED", retryAfter: rl.retryAfter }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }
  const parsed = GuardRequest.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  const notes = parsed.data.notes;

  const cfg = await getModelConfig();
  if (!cfg) {
    const result: GateResult<z.infer<typeof GuardSchema>> = { mode: "SIMULATED", data: guardFallback };
    return NextResponse.json(result);
  }

  const shape = `{
  "verdict": "ALLOWED" | "EXEMPT",
  "clause": string | null,
  "reason_summary": string,
  "safe_reframing": string | null
}`;

  const { system, user } = guardPrompt(JSON.stringify(notes), shape);
  const res = await callModelJSON({ cfg, model: cfg.fast, system, user, maxTokens: 400 }, (x) =>
    GuardSchema.parse(x)
  );

  const result: GateResult<z.infer<typeof GuardSchema>> = res.ok
    ? { mode: "LIVE", model: res.model, data: res.data }
    : { mode: "SIMULATED", data: guardFallback };
  return NextResponse.json(result);
}

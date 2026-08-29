import { NextResponse } from "next/server";
import {
  AssessRequest,
  AssessmentResultSchema,
  assessFallback,
  type AssessmentResult,
  type GateResult,
} from "@/lib/cage/schemas";
import { callModelJSON, getModelConfig } from "@/lib/cage/client";
import { assessPrompt, wrapUntrusted } from "@/lib/cage/prompts";
import { screenValidity } from "@/lib/cage/validity";
import { modelGuard } from "@/lib/cage/ratelimit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const blocked = modelGuard(req, "assess");
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }

  const parsed = AssessRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const { transcript, lang } = parsed.data;

  // 1. Run deterministic screen first.
  const deterministic = screenValidity(transcript);

  // If deterministic screen fails (gibberish, gaming, crypto, recipes, etc.),
  // immediately return refusal without burning tokens or letting the model override it.
  if (!deterministic.is_valid_rti) {
    const fallbackResult = assessFallback(transcript);
    const result: GateResult<AssessmentResult> = {
      mode: "SIMULATED",
      data: fallbackResult,
    };
    return NextResponse.json(result);
  }

  // 2. If model configuration is available, run deep LLM assessment.
  const cfg = await getModelConfig();
  if (!cfg) {
    const result: GateResult<AssessmentResult> = {
      mode: "SIMULATED",
      data: assessFallback(transcript),
    };
    return NextResponse.json(result);
  }

  const shape = `{
  "is_valid_rti": boolean,
  "refusal_reason": string | null,
  "category": string,
  "summary": string,
  "financial": {
    "detected": boolean,
    "details_found": string[],
    "missing_financial_info": string[],
    "questions": string[],
    "suggested_records": string[]
  },
  "follow_up_questions": string[],
  "suggested_records": string[],
  "safe_guidance": string,
  "can_proceed": boolean
}`;

  const { system, user } = assessPrompt(wrapUntrusted(transcript, lang), shape);
  const res = await callModelJSON(
    { cfg, model: cfg.fast, system, user, maxTokens: 800 },
    (x) => AssessmentResultSchema.parse(x)
  );

  if (!res.ok) {
    const result: GateResult<AssessmentResult> = {
      mode: "SIMULATED",
      data: assessFallback(transcript),
    };
    return NextResponse.json(result);
  }

  // Merge: if model flags as invalid, enforce refusal.
  const data = res.data;
  if (!data.is_valid_rti) {
    data.can_proceed = false;
  }

  return NextResponse.json({
    mode: "LIVE",
    model: res.model,
    data,
  });
}

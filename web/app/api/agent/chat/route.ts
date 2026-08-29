import { NextResponse } from "next/server";
import {
  ChatRequest,
  ChatResponseSchema,
  chatFallback,
  type ChatResponse,
  type GateResult,
} from "@/lib/cage/schemas";
import { callModelJSON, getModelConfig } from "@/lib/cage/client";
import { intakeChatPrompt } from "@/lib/cage/prompts";
import { screenValidity } from "@/lib/cage/validity";
import { modelGuard } from "@/lib/cage/ratelimit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const blocked = modelGuard(req, "chat");
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }

  const parsed = ChatRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const { messages, transcript, lang } = parsed.data;

  // Check the latest message and transcript with the deterministic screener.
  const latestUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? transcript;
  const validity = screenValidity(latestUser || transcript);

  // If deterministic screen fails (e.g. video games, gibberish, crypto), cut the conversation immediately.
  if (!validity.is_valid_rti) {
    const fallbackResponse = chatFallback(messages, transcript, lang);
    const result: GateResult<ChatResponse> = {
      mode: "SIMULATED",
      data: fallbackResponse,
    };
    return NextResponse.json(result);
  }

  const cfg = await getModelConfig();
  if (!cfg) {
    const result: GateResult<ChatResponse> = {
      mode: "SIMULATED",
      data: chatFallback(messages, transcript, lang),
    };
    return NextResponse.json(result);
  }

  const shape = `{
  "reply": string,
  "is_valid_rti": boolean,
  "refusal_reason": string | null,
  "can_proceed": boolean,
  "suggested_additions": string[],
  "financial_questions": string[]
}`;

  const historyJson = JSON.stringify(messages.slice(-8));
  const { system, user } = intakeChatPrompt(historyJson, latestUser || transcript, shape);

  const res = await callModelJSON(
    { cfg, model: cfg.fast, system, user, maxTokens: 800 },
    (x) => ChatResponseSchema.parse(x)
  );

  if (!res.ok) {
    const result: GateResult<ChatResponse> = {
      mode: "SIMULATED",
      data: chatFallback(messages, transcript, lang),
    };
    return NextResponse.json(result);
  }

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

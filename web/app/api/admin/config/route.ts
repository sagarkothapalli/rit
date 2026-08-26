import { NextResponse } from "next/server";
import { authedReq } from "@/lib/cage/admin";
import {
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  clearRuntimeConfig,
  getRuntimeModelConfig,
  saveRuntimeConfig,
  setRuntimeLive,
} from "@/lib/cage/config";

export const dynamic = "force-dynamic";

async function ping(baseUrl: string, apiKey: string, model: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        max_tokens: 16,
        messages: [{ role: "user", content: 'Reply with exactly: {"ok":true}' }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Gateway HTTP ${res.status}${text.slice(0, 140) ? ` — ${text.slice(0, 140)}` : ""}`);
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? "";
    return content || "empty reply (reachable)";
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: Request) {
  if (!authedReq(req)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { cfg, meta } = await getRuntimeModelConfig();
  return NextResponse.json({
    configured: Boolean(cfg),
    source: meta?.live ? "admin" : cfg ? "env" : null,
    envFallback: Boolean(process.env.LLM_API_KEY),
    defaults: { baseUrl: DEFAULT_BASE_URL, model: DEFAULT_MODEL },
    meta,
  });
}

export async function POST(req: Request) {
  if (!authedReq(req)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let body: {
    action?: string;
    apiKey?: unknown;
    baseUrl?: unknown;
    model?: unknown;
    live?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }

  try {
    if (body.action === "clear") {
      await clearRuntimeConfig();
      return NextResponse.json({ ok: true, cleared: true });
    }
    if (body.action === "set-live") {
      await setRuntimeLive(body.live === undefined ? true : Boolean(body.live));
      return NextResponse.json({ ok: true });
    }

    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    if (!apiKey) return NextResponse.json({ error: "MISSING_KEY" }, { status: 400 });
    const baseUrl =
      typeof body.baseUrl === "string" && body.baseUrl.trim()
        ? body.baseUrl.trim().replace(/\/+$/, "")
        : DEFAULT_BASE_URL;
    const model =
      typeof body.model === "string" && body.model.trim() ? body.model.trim() : DEFAULT_MODEL;

    const testReply = await ping(baseUrl, apiKey, model);
    await saveRuntimeConfig({ apiKey, baseUrl, modelFast: model, modelStrong: model });

    return NextResponse.json({
      ok: true,
      saved: true,
      keyLast4: apiKey.slice(-4),
      baseUrl,
      model,
      testReply,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "config failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

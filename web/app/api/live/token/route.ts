import { NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";
import { clientKey, rateLimit } from "@/lib/cage/ratelimit";
import { getRuntimeModelConfig } from "@/lib/cage/config";
import { EPHEMERAL_TOKEN_TTL_MS, liveModel } from "@/lib/live/constants";

export const dynamic = "force-dynamic";

/* ============================================================
   Mints a single-use, short-lived ephemeral token for the Live
   API. The citizen's browser connects straight to Google with
   the token — the real key never leaves the server. Key source
   precedence: dedicated GEMINI_LIVE_API_KEY env, then the
   admin-panel runtime key (the AI Studio key), then LLM_* env.

   The mint goes through the installed SDK's authTokens.create
   so the wire format always matches the browser client's SDK.
   ============================================================ */

function liveEnabled(): boolean {
  const v = process.env.GEMINI_LIVE_ENABLED?.trim().toLowerCase();
  return v !== "false" && v !== "0" && v !== "off";
}

async function resolveLiveKey(): Promise<string | null> {
  const dedicated = process.env.GEMINI_LIVE_API_KEY?.trim();
  if (dedicated) return dedicated;
  try {
    const { cfg } = await getRuntimeModelConfig();
    if (cfg?.apiKey?.trim()) return cfg.apiKey.trim();
  } catch {
    // Store unreachable — fall through to env.
  }
  return process.env.LLM_API_KEY?.trim() || null;
}

export async function POST(req: Request) {
  if (!liveEnabled()) {
    return NextResponse.json({ error: "LIVE_DISABLED" }, { status: 409 });
  }

  const rl = rateLimit(clientKey(req, "live-token"), 8, 600_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "RATE_LIMITED", retryAfter: rl.retryAfter }, { status: 429 });
  }

  const apiKey = await resolveLiveKey();
  if (!apiKey) {
    return NextResponse.json({ error: "NO_KEY" }, { status: 409 });
  }

  const model = liveModel();
  const expireTime = new Date(Date.now() + EPHEMERAL_TOKEN_TTL_MS).toISOString();
  try {
    const ai = new GoogleGenAI({ apiKey });
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        liveConnectConstraints: {
          model,
          config: { sessionResumption: {}, responseModalities: [Modality.AUDIO] },
        },
      },
    });
    if (!token?.name) {
      return NextResponse.json({ error: "MINT_FAILED" }, { status: 502 });
    }
    return NextResponse.json({ token: token.name, model, expiresAt: expireTime });
  } catch (err) {
    // Safe to surface: SDK/Google messages describe the failure, never the key.
    const detail = err instanceof Error ? err.message.slice(0, 200) : "unknown error";
    return NextResponse.json({ error: "MINT_FAILED", detail }, { status: 502 });
  }
}

/* ============================================================
   OpenAI-compatible client with a hard cage: JSON-only output,
   temperature 0, timeout, one repair retry, a cross-provider
   retry on DeepSeek, zod validation, deterministic fallback on
   any failure.
   ============================================================ */
import { getRuntimeModelConfig } from "./config";
import { chatBodyExtras, providerOf, FALLBACK_BASE_URL, FALLBACK_MODEL } from "./models";

const TIMEOUT_MS = 30_000;

export interface ModelConfig {
  baseUrl: string;
  apiKey: string;
  fast: string;
  strong: string;
}

export async function getModelConfig(): Promise<ModelConfig | null> {
  const { cfg } = await getRuntimeModelConfig();
  return cfg;
}

interface CallArgs {
  cfg: ModelConfig;
  model: string;
  system: string;
  user: string;
  maxTokens: number;
}

async function rawCall({ cfg, model, system, user, maxTokens }: CallArgs): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        ...chatBodyExtras(model, cfg.baseUrl),
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`LLM HTTP ${res.status}`);
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("LLM empty content");
    return content;
  } finally {
    clearTimeout(timer);
  }
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Tolerate prose-wrapped JSON: grab the outermost braces.
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("LLM non-JSON output");
  }
}

type Result<T> = { ok: true; data: T; model: string } | { ok: false; error: string };

/** Primary model, twice: once straight, once told its output would not parse. */
async function attempt<T>(
  args: CallArgs,
  validate: (x: unknown) => T
): Promise<Result<T>> {
  const { system, user } = args;
  for (let i = 0; i < 2; i++) {
    try {
      const content = await rawCall({
        ...args,
        system: i === 0 ? system : `${system}\n\nREMINDER: your previous reply was not valid JSON of the required shape. Output ONLY the JSON object.`,
        user: i === 0 ? user : `${user}\n\n(Previous attempt failed to parse. Output only the JSON object.)`,
      });
      return { ok: true, data: validate(extractJson(content)), model: args.model };
    } catch (err) {
      if (i === 1) return { ok: false, error: err instanceof Error ? err.message : "LLM call failed" };
    }
  }
  return { ok: false, error: "unreachable" };
}

/* Gemini is the default primary; when it is rate-limited, down, or returning
   junk, DeepSeek answers rather than dropping the citizen to a deterministic
   stub. It needs its own credential — the runtime config holds one key, and it
   is the Gemini one — so: DEEPSEEK_API_KEY, or the LLM_* pair when that already
   points at DeepSeek. No key, no cross-provider retry. */
function fallbackFor(cfg: ModelConfig, model: string): CallArgs["cfg"] | null {
  if (providerOf(model, cfg.baseUrl) === "deepseek") return null;
  const apiKey =
    process.env.DEEPSEEK_API_KEY?.trim() ||
    (process.env.LLM_BASE_URL?.includes("deepseek.com") ? process.env.LLM_API_KEY?.trim() : "");
  if (!apiKey) return null;
  return { baseUrl: FALLBACK_BASE_URL, apiKey, fast: FALLBACK_MODEL, strong: FALLBACK_MODEL };
}

export async function callModelJSON<T>(
  args: Omit<CallArgs, "maxTokens"> & { maxTokens?: number },
  validate: (x: unknown) => T
): Promise<Result<T>> {
  const call = { ...args, maxTokens: args.maxTokens ?? 700 };

  const primary = await attempt(call, validate);
  if (primary.ok) return primary;

  const cfg = fallbackFor(args.cfg, args.model);
  if (!cfg) return primary;

  // model comes back in the response, so the UI names whoever actually answered.
  const second = await attempt({ ...call, cfg, model: FALLBACK_MODEL }, validate);
  return second.ok ? second : primary;
}

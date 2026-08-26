/* ============================================================
   OpenAI-compatible client with a hard cage: JSON-only output,
   temperature 0, timeout, one repair retry, zod validation,
   deterministic fallback on any failure.
   ============================================================ */
import { getRuntimeModelConfig } from "./config";
import { chatBodyExtras } from "./models";

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

export async function callModelJSON<T>(
  args: Omit<CallArgs, "maxTokens"> & { maxTokens?: number },
  validate: (x: unknown) => T
): Promise<{ ok: true; data: T; model: string } | { ok: false; error: string }> {
  const { cfg, model, system, user } = args;
  const maxTokens = args.maxTokens ?? 700;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const content = await rawCall({
        cfg,
        model,
        system: attempt === 0 ? system : `${system}\n\nREMINDER: your previous reply was not valid JSON of the required shape. Output ONLY the JSON object.`,
        user: attempt === 0 ? user : `${user}\n\n(Previous attempt failed to parse. Output only the JSON object.)`,
        maxTokens,
      });
      const parsed = validate(extractJson(content));
      return { ok: true, data: parsed, model };
    } catch (err) {
      if (attempt === 1) {
        const msg = err instanceof Error ? err.message : "LLM call failed";
        return { ok: false, error: msg };
      }
    }
  }
  return { ok: false, error: "unreachable" };
}

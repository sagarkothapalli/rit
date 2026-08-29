export const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
export const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";

export const DEFAULT_BASE_URL = GEMINI_BASE_URL;
export const DEFAULT_MODEL = "gemini-3.5-flash-lite";

/** Cross-provider fallback. Serves the request when the primary errors out —
    quota, 5xx, timeout, or output that will not parse. See callModelJSON. */
export const FALLBACK_BASE_URL = DEEPSEEK_BASE_URL;
export const FALLBACK_MODEL = "deepseek-v4-flash";

export type ModelProvider = "deepseek" | "gemini";

export interface ModelOption {
  id: string;
  label: string;
  provider: ModelProvider;
  baseUrl: string;
  hint: string;
}

export const MODEL_CATALOG: ModelOption[] = [
  {
    id: "deepseek-v4-flash",
    label: "DeepSeek V4 Flash",
    provider: "deepseek",
    baseUrl: DEEPSEEK_BASE_URL,
    hint: "Fallback when Gemini fails",
  },
  {
    id: "gemini-3.7-flash",
    label: "Gemini 3.7",
    provider: "gemini",
    baseUrl: GEMINI_BASE_URL,
    hint: "Latest Gemini Flash",
  },
  {
    id: "gemini-3.6-flash",
    label: "Gemini 3.6",
    provider: "gemini",
    baseUrl: GEMINI_BASE_URL,
    hint: "Previous Gemini Flash",
  },
  {
    id: "gemini-3.5-flash",
    label: "Gemini 3.5",
    provider: "gemini",
    baseUrl: GEMINI_BASE_URL,
    hint: "Gemini 3.5 Flash",
  },
  {
    id: "gemini-3.5-flash-lite",
    label: "Gemini 3.5 Flash Lite",
    provider: "gemini",
    baseUrl: GEMINI_BASE_URL,
    hint: "Current After Speech default — fastest, lowest cost",
  },
];

export function findModel(id: string | undefined): ModelOption | undefined {
  if (!id) return undefined;
  return MODEL_CATALOG.find((m) => m.id === id);
}

export function providerOf(model: string, baseUrl: string): ModelProvider | "other" {
  const known = findModel(model);
  if (known) return known.provider;
  if (model.startsWith("gemini") || baseUrl.includes("googleapis.com")) return "gemini";
  if (model.startsWith("deepseek") || baseUrl.includes("deepseek.com")) return "deepseek";
  return "other";
}

/** Provider-specific chat.completions fields. JSON gates need the object, not a long CoT. */
export function chatBodyExtras(model: string, baseUrl: string): Record<string, unknown> {
  const provider = providerOf(model, baseUrl);
  if (provider === "deepseek") return { thinking: { type: "disabled" } };
  if (provider === "gemini") {
    // 3.7 Flash rejects "minimal". Flash-Lite defaults to minimal and is built for JSON extraction.
    return { reasoning_effort: model.includes("flash-lite") ? "minimal" : "low" };
  }
  return {};
}

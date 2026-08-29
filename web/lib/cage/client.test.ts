import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callModelJSON, type ModelConfig } from "./client";

const gemini: ModelConfig = {
  baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
  apiKey: "AIza-test",
  fast: "gemini-3.5-flash-lite",
  strong: "gemini-3.5-flash-lite",
};

const args = { cfg: gemini, model: gemini.fast, system: "s", user: "u", maxTokens: 50 };
const ok = (obj: unknown) =>
  new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(obj) } }] }), {
    status: 200,
  });
const rateLimited = () => new Response("quota", { status: 429 });
const urls = () => vi.mocked(fetch).mock.calls.map((c) => String(c[0]));

describe("cross-provider fallback", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    delete process.env.LLM_BASE_URL;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.DEEPSEEK_API_KEY;
  });

  it("answers on DeepSeek when Gemini is rate-limited", async () => {
    process.env.DEEPSEEK_API_KEY = "sk-test";
    vi.mocked(fetch)
      .mockResolvedValueOnce(rateLimited())
      .mockResolvedValueOnce(rateLimited())
      .mockResolvedValueOnce(ok({ v: 1 }));

    const res = await callModelJSON(args, (x) => x as { v: number });
    expect(res).toMatchObject({ ok: true, data: { v: 1 }, model: "deepseek-v4-flash" });
    expect(urls()[0]).toContain("googleapis.com");
    expect(urls()[2]).toContain("api.deepseek.com");
  });

  it("stays on Gemini when it works", async () => {
    process.env.DEEPSEEK_API_KEY = "sk-test";
    vi.mocked(fetch).mockResolvedValue(ok({ v: 2 }));

    const res = await callModelJSON(args, (x) => x as { v: number });
    expect(res).toMatchObject({ ok: true, model: "gemini-3.5-flash-lite" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("gives up (deterministic fallback) with no DeepSeek key", async () => {
    vi.mocked(fetch).mockResolvedValue(rateLimited());

    const res = await callModelJSON(args, (x) => x);
    expect(res.ok).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

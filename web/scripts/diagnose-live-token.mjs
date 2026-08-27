/* Diagnostic: why does POST /v1beta/auth_tokens return 400?
   Never prints the key — only its source, length, and Google's error text. */
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

let key = env.GEMINI_LIVE_API_KEY || "";
let source = key ? "GEMINI_LIVE_API_KEY" : "none";
if (!key) {
  try {
    const rc = JSON.parse(fs.readFileSync(".data/runtime-config.json", "utf8"));
    if (rc.api_key) { key = rc.api_key; source = `file-store (base_url=${rc.base_url}, live=${rc.live})`; }
  } catch { /* no file store */ }
}
if (!key && env.LLM_API_KEY) { key = env.LLM_API_KEY; source = `LLM_API_KEY (base_url=${env.LLM_BASE_URL})`; }
console.log("resolved key source:", source, "| length:", key.length, "| looks like Google key:", /^AIza/.test(key));

async function attempt(label, body) {
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/auth_tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const text = await res.text();
  console.log(`\n[${label}] HTTP ${res.status}`);
  console.log(text.slice(0, 500).replace(/AIza[0-9A-Za-z_\-]+/g, "REDACTED"));
  return res.ok;
}

const model = process.env.GEMINI_LIVE_MODEL?.trim() || "gemini-3.1-flash-live-preview";
if (!key) { console.log("No key resolved — the route would 409 (chips fallback)."); process.exit(0); }

const a = await attempt("A: full body (models/ prefix, sessionResumption, AUDIO)", {
  uses: 1,
  expireTime: new Date(Date.now() + 600_000).toISOString(),
  liveConnectConstraints: { model: `models/${model}`, config: { sessionResumption: {}, responseModalities: ["AUDIO"] } },
});
if (!a) {
  await attempt("B: model without models/ prefix", {
    uses: 1,
    expireTime: new Date(Date.now() + 600_000).toISOString(),
    liveConnectConstraints: { model, config: { responseModalities: ["AUDIO"] } },
  });
  await attempt("C: minimal constraints (model only)", {
    uses: 1,
    expireTime: new Date(Date.now() + 600_000).toISOString(),
    liveConnectConstraints: { model: `models/${model}` },
  });
  await attempt("D: no liveConnectConstraints at all", { uses: 1, expireTime: new Date(Date.now() + 600_000).toISOString() });
}

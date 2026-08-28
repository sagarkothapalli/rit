/* End-to-end smoke test for the live intake — no mic, no browser.
   1. Resolves the key exactly like app/api/live/token/route.ts does.
   2. Mints an ephemeral token via authTokens.create.
   3. Connects to the Live API with the real intake config, read out
      of lib/live/intakePrompt.ts rather than copied — a second copy
      drifts, and then the smoke test stops testing production.
   4. Sends the greeting nudge, listens ~20 s, closes.
   Never prints the token or the key. Run: node scripts/live-smoke.mjs */
import fs from "node:fs";
import { GoogleGenAI, Modality } from "@google/genai";

const env = Object.fromEntries(
  fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

let apiKey = process.env.GEMINI_LIVE_API_KEY || "";
if (!apiKey) {
  try {
    apiKey = JSON.parse(fs.readFileSync(new URL("../.data/runtime-config.json", import.meta.url), "utf8")).api_key || "";
  } catch { /* no file store */ }
}
if (!apiKey) apiKey = env.LLM_API_KEY || "";
if (!apiKey) { console.log("NO KEY RESOLVED — aborting"); process.exit(1); }

const model = process.env.GEMINI_LIVE_MODEL?.trim() || "gemini-3.1-flash-live-preview";

/* ---------- read the live artefacts from source ---------- */

function read(relative) {
  return fs.readFileSync(new URL(relative, import.meta.url), "utf8");
}

/** The one supported-language list, shared by the prompt and the app. */
const LANG_LIST = [...read("../lib/live/constants.ts")
  .match(/SUPPORTED_LANG_CODES = \[([\s\S]*?)\]/)[1]
  .matchAll(/"([a-z]{2}-[A-Z]{2})"/g)].map((m) => m[1]).join(", ");

/** The production system prompt, with its single interpolation resolved. */
const promptSource = read("../lib/live/intakePrompt.ts");
const SYSTEM = promptSource
  .match(/export const LIVE_INTAKE_SYSTEM = `([\s\S]*?)`;\n/)[1]
  .replace(/\$\{LANG_LIST\}/g, LANG_LIST);

/** The production tool declaration, minus its TypeScript wrapper. */
const DECL = JSON.parse(
  promptSource
    .match(/export const submitIntakeDeclaration = (\{[\s\S]*?\n\}) as unknown as FunctionDeclaration;/)[1]
    // Object keys and single quotes are TS source, not JSON.
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":')
    .replace(/,(\s*[}\]])/g, "$1")
    // Multi-line string concatenation in descriptions.
    .replace(/"\s*\+\s*"/g, "")
);

/** The greeting nudge the hook injects on setupComplete. */
const GREETING_NUDGE = [
  ...read("../hooks/useLiveIntake.ts")
    .match(/const GREETING_NUDGE =\n([\s\S]*?);\n/)[1]
    // The value is a chain of concatenated string literals.
    .matchAll(/"((?:[^"\\]|\\.)*)"/g),
].map((m) => m[1]).join("");

console.log(`prompt: ${SYSTEM.length} chars, tool: ${DECL.name}, languages: ${LANG_LIST.split(", ").length}`);

const ai = new GoogleGenAI({ apiKey });
const token = await ai.authTokens.create({
  config: {
    uses: 1,
    expireTime: new Date(Date.now() + 10 * 60_000).toISOString(),
    liveConnectConstraints: {
      model,
      config: { sessionResumption: {}, responseModalities: [Modality.AUDIO] },
    },
  },
});
console.log("token minted:", Boolean(token?.name));

const counts = {
  setupComplete: 0, audioChunks: 0, audioBytes: 0, inputTranscriptChars: 0,
  outputTranscriptChars: 0, turnComplete: 0, interrupted: 0, toolCalls: 0,
};

let liveSession = null;
let spoken = "";
const pending = [];

function handle(m) {
  if (m.setupComplete) {
    counts.setupComplete++;
    liveSession.sendClientContent({
      turns: { role: "user", parts: [{ text: GREETING_NUDGE }] },
    });
    console.log("setupComplete → greeting nudge sent");
    return;
  }
  const sc = m.serverContent;
  if (sc?.inputTranscription?.text) counts.inputTranscriptChars += sc.inputTranscription.text.length;
  if (sc?.outputTranscription?.text) {
    counts.outputTranscriptChars += sc.outputTranscription.text.length;
    // The opening line is the thing most likely to regress — print it.
    spoken += sc.outputTranscription.text;
  }
  if (sc?.modelTurn?.parts) {
    for (const p of sc.modelTurn.parts) {
      if (p.inlineData?.data && (p.inlineData.mimeType ?? "audio/pcm").startsWith("audio/pcm")) {
        counts.audioChunks++;
        counts.audioBytes += p.inlineData.data.length;
      }
    }
  }
  if (sc?.turnComplete) counts.turnComplete++;
  if (sc?.interrupted) counts.interrupted++;
  if (m.toolCall?.functionCalls?.length) {
    counts.toolCalls += m.toolCall.functionCalls.length;
    console.log("toolCall args:", JSON.stringify(m.toolCall.functionCalls[0]?.args ?? {}).slice(0, 300));
    liveSession.sendToolResponse({
      functionResponses: [{ id: m.toolCall.functionCalls[0]?.id, name: "submit_intake", response: { ok: true } }],
    });
  }
}

const session = await ai.live.connect({
  model,
  config: {
    responseModalities: [Modality.AUDIO],
    sessionResumption: {},
    systemInstruction: SYSTEM,
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    tools: [{ functionDeclarations: [DECL] }],
  },
  callbacks: {
    onopen: () => console.log("ws: open"),
    onmessage: (m) => {
      if (!liveSession) {
        pending.push(m);
        return;
      }
      handle(m);
    },
    onerror: (e) => console.log("ws error:", e?.message ?? String(e)),
    onclose: (e) => console.log("ws closed:", e?.reason ?? "(no reason)"),
  },
});
liveSession = session;
for (const m of pending) handle(m);

setTimeout(() => {
  console.log("opening line:", spoken.replace(/\s+/g, " ").trim().slice(0, 400) || "(nothing spoken)");
  console.log("summary:", JSON.stringify(counts));
  try { session.close(); } catch { /* noop */ }
  process.exit(0);
}, 20_000);


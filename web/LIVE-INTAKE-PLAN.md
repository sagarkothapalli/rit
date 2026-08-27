# LIVE INTAKE PLAN — Gemini Live voice agent at "Start your request"

Status: IMPLEMENTED (2026-08-27). Preflight passed: ephemeral tokens mint successfully with the admin-panel key; a headless smoke test (`npm-less: node scripts/live-smoke.mjs`) confirms setup, greeting audio, and output transcription on `gemini-3.1-flash-live-preview`. Lint, production build, kill-switch (409) and static hosted export all pass. Remaining: a manual browser run-through on real devices (Chrome/Edge/Safari/Firefox + Android).

## 0. The problem and the shape of the fix

Today: `Start your request` → `/request` → **setup stage forces the citizen to hand-pick one of 12 language chips before the mic ever opens** (`web/app/demo/page.tsx`, `LANGUAGES` + `goSetup()`). Web Speech (`hooks/useSpeech.ts`) then transcribes with that fixed `lang`. A citizen who does not find their language, or cannot read the script options, is stuck before saying a word. No conversation happens — it is a one-way recorder.

Fix: replace the setup moment with a **conversational live intake** powered by the Gemini Live API (`gemini-3.1-flash-live-preview`, the "Gemini 3 Flash Live" model):

1. Citizen taps one button — **"Talk to the assistant"**. Mic opens. No language picking.
2. The agent greets, **detects the citizen's language by ear**, and replies in that language (native-audio live models switch languages naturally; all 12 `LANGUAGES` codes are in the Live API's 97-language set).
3. The citizen just talks (complaint, rant, half a thought). The agent may ask **at most 3 short clarifying questions, one at a time**, and can be **interrupted mid-sentence** (barge-in) — a real interactive section, not a dictaphone.
4. When the citizen stops, the agent calls our single function tool `submit_intake` → we take its structured handoff + the **full word-by-word transcript** (captured via the Live API's input audio transcription) + the detected language, show them for confirmation, and enter the **existing pipeline at the notes gate** unchanged.

Scope rule ("only about this website") is enforced **by construction**, not by asking nicely:

- `systemInstruction` pins the persona to this site's RTI intake flow, with a one-line refusal-and-redirect script for anything off-scope.
- The session declares **exactly one tool** — our `submit_intake` — and **no Google Search tool**, so the model has no path to the open web or general-knowledge acting.
- Even if the agent ever strays, only text the citizen confirms plus `submit_intake` fields continue downstream; GATE 1 (temperature 0, zod, deterministic fallback) remains the single source of truth for drafting.

## 1. Verified technical facts (docs checked Aug 2026)

- **Transport:** stateful WebSocket (WSS). Input: raw 16-bit PCM, 16 kHz, little-endian, base64, `audio/pcm;rate=16000`. Output: raw 16-bit PCM, 24 kHz, base64 chunks in `serverContent.modelTurn.parts[].inlineData`.
- **Model:** `gemini-3.1-flash-live-preview` (Preview). `thinkingLevel` defaults to `minimal` → lowest latency, right for voice. Supports **function calling, synchronous only** (we need exactly one call). Supports `inputAudioTranscription` / `outputAudioTranscription`.
- **Browser auth:** Live API is server-to-server by default; for **client-to-server** (browser → Google directly) Google's documented mitigation is **ephemeral tokens**:
  - Server mints: `client.authTokens.create({ config: { uses: 1, expireTime, liveConnectConstraints: { model: 'gemini-3.1-flash-live-preview', config: { sessionResumption: {}, responseModalities: ['AUDIO'] } } } })` (SDK) or `POST https://generativelanguage.googleapis.com/v1beta/auth_tokens` with `x-goog-api-key` (REST).
  - Browser uses `new GoogleGenAI({ apiKey: token.name })` — the token **replaces** the API key, only works for the Live API, short expiry, single use, and `liveConnectConstraints` **locks the model and modalities** so a leaked token cannot open arbitrary sessions.
  - Connection: `ai.live.connect({ model, config: { responseModalities: [Modality.AUDIO], systemInstruction, tools, inputAudioTranscription: {}, outputAudioTranscription: {} }, callbacks: { onopen, onmessage, onerror, onclose } })`; session methods `sendRealtimeInput`, `sendClientContent`, `sendToolResponse`, `close()`.
- **Session limits:** audio-only sessions cap at 15 minutes (extendable via session resumption — not needed; our intake is designed ≤ 5). Context window 128k tokens for native-audio models — irrelevant at our scale.
- **Rate limits:** applied **per project**, per model — the RPM figure you see in AI Studio applies to this key. Treat "unlimited" as "generous but finite": concurrent-session caps are the realistic pinch point on free tiers, so the client enforces one session per tab and the token route is rate-limited.

## 2. Architecture: client-to-server with ephemeral tokens (chosen)

```
Browser (Chrome/Edge/Safari/Firefox)        Next.js server (HTTP only)            Google Live API (WSS)
┌────────────────────────────────┐   POST /api/live/token    ┌──────────────────────┐   WSS  client→Google
│ tap "Talk to the assistant" ───┼──────────────────────────▶│ authTokens.create    │◀────── direct, audio
│ @google/genai (dynamic import) │◀─── token.name (1 use,    │ uses:1, 10-min expiry│        never touches
│ mic → 16kHz PCM → sendRealtime │     constraints locked)   │ key stays server-side│        our server
│ agent PCM 24kHz → speaker      │   POST /api/agent/notes   └──────────────────────┘
│ inputAudioTranscription text   ├─── transcript + lang (EXACTLY today's contract)
│ submit_intake toolCall → close │
└────────────────────────────────┘
```

Why client-to-server: audio does not hop through our server (latency), and the app stays a stateless HTTP Next.js app. A server-to-server audio relay was **rejected**: Next.js route handlers cannot hold WebSockets without a custom server, it breaks `npm run build:hosted` (static export moves `app/api` aside), and adds a hop.

Hosted static deploys (here.now): add a second `hosting/proxy.json` entry — `POST /api/live-token → generativelanguage.googleapis.com/v1beta/auth_tokens` with header `x-goog-api-key: ${LLM_API_KEY}`. The pass-through proxy cannot pin the request body's model field, so on static hosts this ships **behind a tighter rate limit and a feature flag** (or simply flagged off until then); the chips flow covers those users. Local/Vercel deploys use the real route, which pins everything server-side.

## 3. The intake agent contract

**System instruction (essence):**

> You are the voice intake assistant inside the Praja RTI drafting workspace (an independent RTI Act, 2005 records-request assistant). You speak ONLY about preparing an RTI records request on this site. Greet briefly. Mirror the citizen's language (BCP-47 among the site's 12 supported); if unclear, ask one short "which language" question. Let the citizen talk; do not interrupt them. Ask at most 3 short clarifying questions, one at a time (place, date range, department if material). If asked anything off-scope (news, general knowledge, other sites), answer in one short line that you can only help prepare an RTI request here, and steer back. Never give legal advice, never invent records, authorities, dates or amounts. When the citizen has said their piece, confirm a one-line summary and call `submit_intake`.

**One tool — `submit_intake`** (synchronous; validated with zod before anything proceeds):

```
IntakeHandoffSchema = {
  detected_lang: BCP-47 enum of the 12 LANGUAGES codes,   // defaults "en-IN"
  summary: string (max 600),        // agent's one-line confirmation of the need
  place: string | null,             // only what the citizen actually said
  date_range: string | null,
  authority_hint: string | null
}
```

On `toolCall`: client zod-validates → `sendToolResponse({ ok: true })` → graceful `close()` → demo page sets `lang = detected_lang`, seeds the transcript, and lands on the **record stage in review state** so the citizen can read/edit every word before `runNotes` — preserving the product's "citizen confirms every consequential step" rule.

The live model never produces `Notes`. That stays GATE 1's job.

## 4. Client audio plumbing — known bug sites and their preventions

| Risk | Prevention |
|---|---|
| Wrong sample rate/format | AudioWorklet downsamples mic → mono Int16 @16 kHz; hard-coded mime `audio/pcm;rate=16000`; output playback via a 24 kHz `AudioContext`; pure helper module `lib/live/audio.ts` so both are unit-checkable |
| Agent hearing itself (feedback loop) | `getUserMedia({ echoCancellation: true, noiseSuppression: true, autoGainControl: true })`; playback only through the WebAudio graph |
| Barge-in not working | Treat `serverContent.interrupted` as an immediate playback-queue flush; never schedule > 200 ms ahead |
| Sending audio before setup | Gate on the `setupComplete` message in the `onopen` flow |
| Session runs away | Client timer: soft wrap prompt at 4 min, hard `close()` at 5; one session per tab; new token per session (`uses: 1`) |
| Dropped frames / await pileup | Fixed-size ring buffer flushed on a 100 ms interval; never `await` inside the audio callback |
| Losing the citizen's words | `inputAudioTranscription` text is accumulated separately from the session; on ANY close (error, limit, network) the transcript survives into the record stage — worst case the citizen edits text and continues exactly as today |

## 5. File map (additive; the old flow is not rewritten)

```
NEW  app/api/live/token/route.ts     ephemeral token mint (rate-limited, key precedence below)
NEW  lib/live/constants.ts           model id, mime types, sample rates, session caps
NEW  lib/live/intakePrompt.ts        systemInstruction + submit_intake declaration + IntakeHandoffSchema
NEW  lib/live/audio.ts               resampler worklet source, playback queue, base64 helpers
NEW  hooks/useLiveIntake.ts          state machine: idle→connecting→greeting→listening→wrapup→done|failed
CHG  app/demo/page.tsx               setup stage: live-intake card first, chips as "Pick my language instead"
                                     details block; record stage accepts prefilled transcript+lang; badges;
                                     privacy notice line updated
CHG  .env.example                    GEMINI_LIVE_MODEL / GEMINI_LIVE_API_KEY (optional overrides)
CHG  hosting/proxy.json              /api/live-token entry (flagged, static deploys only)
OPT  app/admin/page.tsx              "Live intake" toggle + model readout
DEP  @google/genai                   dynamically imported only when live intake starts (keeps landing lean)
```

Key precedence for minting (mirrors `lib/cage/config.ts` philosophy): `GEMINI_LIVE_API_KEY` env → admin-saved runtime key when its `base_url` is `generativelanguage.googleapis.com` → `LLM_API_KEY` when `LLM_BASE_URL` is googleapis → route returns 409 and the UI shows "Voice assistant unavailable" with the chips flow.

## 6. Failure ladder — every failure has a defined landing

| Failure | Behavior |
|---|---|
| Token route 429 / no entitlement / key bad | Notice: "Voice assistant unavailable right now" → chips flow (today's UX, zero regression) |
| WSS blocked (network/firewall), `onerror`, early `onclose` | Partial transcript preserved → record stage; citizen continues in text |
| 15-min cap / `goAway` | Agent prompted to wrap at 4 min; hard close at 5; transcript into record stage |
| Citizen silent 20 s | Agent re-prompts once; 40 s → offers to close; close → record stage |
| Mic denied | Text box (existing behavior) |
| Off-scope ask | System-instruction redirect; nothing off-scope can reach the draft (only confirmed text + zod-valid `submit_intake` proceed, and GATE 2 guard still runs) |
| Speech injection ("ignore instructions…") | Agent holds one harmless tool; payload zod-validated into fields the citizen could have typed anyway; transcript stays UNTRUSTED data wrapped by the existing `wrapUntrusted` downstream |
| Firefox | **Upgrade, not regression:** live intake works over WS + AudioWorklet where Web Speech never did; if it fails → text fallback |
| Static host | Flagged proxy entry or flag-off; chips flow |
| Rollback | Single boolean (`GEMINI_LIVE_ENABLED` env / admin toggle) → UI byte-identical to today; all live code is additive |

## 7. Privacy & copy obligations (must ship with the feature)

The masthead currently says "Only edited transcript text is analysed. Audio is not sent." — true for Web Speech, **false during a live session**. Update to: *"During the live conversation, your voice is processed in real time by Google's Live API. Only the text you review and confirm is analysed for drafting; the recording is not stored by this site."* The transcript remains visible and editable before anything is analysed (unchanged product principle). No transcript or audio logging server-side, same as today.

## 8. Build order (each step lands green)

0. **Preflight — before any code (decision gate):**
   - AI Studio → Stream tab: confirm `gemini-3.1-flash-live-preview` answers on the project's key; note the exact RPM / concurrent-session limits shown for it (the "unlimited" claim gets pinned to numbers here).
   - `curl` the `auth_tokens` endpoint with the key → confirm ephemeral tokens are issued on this tier. If not entitled: everything below still builds, the route returns 409, the UI defaults to chips, and we flip the flag when billing/tier allows.
   - Confirm the current model slug on the Models page (Preview models get replaced — pin via `GEMINI_LIVE_MODEL`, never hardcode beyond the default).
1. `npm i @google/genai`; add `lib/live/{constants,intakePrompt,audio}.ts` (pure code) — tsc + eslint green.
2. `app/api/live/token/route.ts` — key precedence + rate limit (reuse `lib/cage/ratelimit`); curl-test: returns `token.name`, rejects spam, returns 409 with no key.
3. `hooks/useLiveIntake.ts` + dev-only test panel — speak → agent replies → transcript appears → `submit_intake` logs. Device matrix: Chrome, Edge, Safari, Firefox, Android Chrome; barge-in drill; silence drill; 4-minute wrap drill.
4. Integrate into `app/demo/page.tsx` setup stage (card, escape hatch, badges, privacy copy). Old flow untouched behind the same stage machine.
5. Failure drills from §6 as an explicit checklist (kill network, revoke key, injection attempt, off-scope ask).
6. Static-host proxy entry + `npm run build:hosted` green; verify hosted fallback behavior.
7. Optional: admin toggle + model readout.

## 9. Acceptance checks

- `Start your request` → `Talk to the assistant` → speak Hindi without picking a language → agent replies in Hindi → ≤ 3 clarifying questions → wrap-up → record stage shows the full transcript and the auto-detected language → notes gate output identical in shape to today's.
- Interrupt the agent mid-sentence: playback stops within ~300 ms and it listens.
- Off-scope ask: refused in one line and redirected; nothing off-scope in the transcript that proceeds.
- Wi-Fi killed mid-session: partial transcript preserved, one notice, "Continue in text" works.
- `GEMINI_LIVE_ENABLED=false`: current chips UI, zero new network calls.
- `npm run build` and `npm run build:hosted` pass; DevTools shows only `token.name` leaving the server — never the API key.
- Privacy notice updated and truthful (§7).

## 10. Open decisions (confirm before step 3)

1. **Voice:** pick one `speechConfig` voice name for brand consistency; note it in `lib/live/constants.ts`.
2. **Interaction depth:** keep the live session to one conversation ending in `submit_intake` (recommended — no gate reruns inside the live session), leaving the existing notes-stage "one question at a time" loop as-is.
3. **Static-host exposure:** ship the `/api/live-token` proxy entry live, or flag off on static hosts at first (recommended off until body-pinning can be trusted to the proxy).

## 11. Implementation notes (as built)

- **Mint goes through the installed SDK** (`ai.authTokens.create` in `app/api/live/token/route.ts`), not hand-rolled REST: the v1beta `auth_tokens` endpoint expects the constraints serialized as `config.bidiGenerateContentSetup` (the SDK does this mapping). A raw `liveConnectConstraints` JSON body is rejected with 400 `INVALID_ARGUMENT` — discovered during preflight via `scripts/diagnose-live-token.mjs`.
- **Key resolution confirmed working:** the admin-panel file-store key (`base_url=…googleapis.com/v1beta/openai`) mints tokens for `gemini-3.1-flash-live-preview` — the key's tier supports ephemeral tokens.
- **Headless smoke test** (`scripts/live-smoke.mjs`): mint → connect → setupComplete → greeting audio (27 chunks / ~415 KB PCM) → output transcription text (112 chars) → turnComplete. Mirrors the exact production config (system instruction, `submit_intake` tool, both transcriptions, Kore voice).
- **Message race handled:** the SDK can deliver `setupComplete` before `connect()` resolves — the hook buffers early messages in `pendingRef` and replays them (same pattern as the smoke script).
- **Greeting nudge** is sent by the client on `setupComplete` (the model stays silent until it receives input).
- **Rate limit:** 8 mints / 10 min / IP (reuses `lib/cage/ratelimit`); kill-switch `GEMINI_LIVE_ENABLED=false` → 409 → chips flow (verified).
- **Static hosts:** live card is hidden via `onStaticHost()`; `out/live/pcm-resampler.js` ships in the export for future use. No proxy entry added (decision §10.3).





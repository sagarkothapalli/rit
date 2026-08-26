# REAL DEMO PLAN — live mic + caged LLM (replaces the scripted /demo)

Status: PLANNED, awaiting key + model IDs. Nothing here files with any government system; the LLM assists drafting only.

## 0. What you must provide (one .env.local)

```
LLM_BASE_URL=https://<gmi-cloud-openai-compatible-endpoint>/v1
LLM_API_KEY=<your gmi cloud key>
LLM_MODEL_FAST=<e.g. the free/ox-alpha slug>     # notes, guard, explain
LLM_MODEL_STRONG=<e.g. minimax-m3 slug>          # drafting (falls back to FAST)
```
Any OpenAI-compatible endpoint works. If env is absent → the demo auto-runs in SIMULATED mode (current fixtures) with a visible badge. Exact GMI base URL + model IDs needed from you; nothing is hardcoded.

## 1. Architecture

```
Browser (Chrome)                          Next.js server (the cage)                LLM (GMI Cloud)
┌────────────────────────┐   POST /api/agent/notes   ┌──────────────────────────┐   OpenAI-compatible
│ Mic → Web Speech API   │──▶ zod validate ─▶ GATE 1 ─▶ json_schema call ──────▶ fast model
│ live interim transcript│   POST /api/agent/guard   │ zod validate ────────────┐
│ editable by citizen    │──▶ GATE 2 ─▶ fast model ──┘                          │
│                        │   POST /api/agent/draft   GATE 3 ─▶ strong model      │
│ local mock directory   │──▶ POST /api/agent/explain GATE 4 ─▶ fast model ──────┘
│ (BM25 in code)         │            every gate: timeout 20s · 1 retry · zod-or-fallback
└────────────────────────┘
```

- Mic: `hooks/useSpeech.ts` wraps `webkitSpeechRecognition` (continuous + interim), language from a picker (auto, en-IN, hi-IN, ta-IN, te-IN, bn-IN, mr-IN, gu-IN, kn-IN, ml-IN, pa-IN, or-IN, ur-IN). Unsupported browser → manual text box. Mic denied → text box. All labeled.
- Transcript is always visible and editable before it goes anywhere. Only the edited transcript text leaves the browser (never audio) — stated in the UI.

## 2. The cage (every property is enforced in code, not by asking nicely)

1. **Structured outputs only.** Each gate uses `response_format: json_schema` (strict) + `temperature 0` + `max_tokens` caps. Server re-validates with zod; invalid JSON → 1 retry → deterministic fallback object. The model cannot emit prose that reaches the UI unvalidated.
2. **Transcript is untrusted data.** Wrapped in delimited blocks with an instruction-ignoring system preamble (prompt-injection defense). Speech can never change the agent's rules.
3. **The model never picks departments.** Routing = local BM25/keyword retrieval over `data/mock-directory.json` (~50 curated PAs, dated, labeled). GATE 4 only writes a one-line "why" + "caveat" for candidates the code already retrieved. Zero hallucinated authorities by construction.
4. **Guard runs before drafting.** GATE 2 returns `{verdict: ALLOWED|EXEMPT, clause, reason_summary ≤60 words, safe_reframing?}`. EXEMPT → drafting endpoint is not called; UI renders the refusal from fields only.
5. **Draft lint in code.** 3–5 requests, each starting "Please provide", total ≤3000 chars, blocklist check for accusatory/defamatory tokens ("corrupt", "officer must be punished", …). Violations → auto-repair prompt once → else fallback template.
6. **Key hygiene.** Key only in server env; API routes return generic errors; simple in-memory rate limit (30 req/min/IP); no transcript logging.

## 3. The four gates (contracts)

| Gate | Input (zod) | Output (zod) | Model |
|---|---|---|---|
| 1 NOTES | `{transcript, lang}` | `{records_sought[], date_range?, place?, body_hint?, format?, missing_essentials[], is_state_matter, state_name?}` | FAST |
| 2 GUARD | notes JSON | `{verdict, clause?, reason_summary, safe_reframing?}` | FAST |
| 3 DRAFT | confirmed notes | `{title, requests[3..5], character_count}` | STRONG (fallback FAST) |
| 4 EXPLAIN | notes + top-3 PAs from local retrieval | `{candidates:[{id, why ≤25 words, caveat ≤20 words}]}` | FAST |

Missing essentials → the page asks ONE question at a time (from `missing_essentials`, plain-language templates), answer appends to transcript, re-run GATE 1. "I don't know" is always accepted.

## 4. Demo UX (stages, all real)

1. **Setup** — language picker + mic check + mode badges: `Mic: Web Speech` · `Model: LIVE (minimax-m3)` or `SIMULATED`.
2. **Record** — big mic button, pulsing while listening, interim transcript streams in; stop → edit transcript → "Send to agent".
3. **Notes** — extracted essentials as editable chips; one missing-detail question at a time; confirm.
4. **Guard** — ALLOWED (auto-continue) or refusal card (clause + summary + optional reframe button).
5. **Draft** — numbered requests appear; inline editable; live char counter vs 3,000.
6. **Departments** — exactly 3 cards (retrieved + explained); manual search over the same directory; override with acknowledgment.
7. **Finish** — mock OTP (judge code shown), confirm, mock Rs 10 pay, DEMO receipt (NOT SUBMITTED). Same as today.

## 5. Failure ladder (live-demo safety)

Key invalid/timeout/invalid-JSON → SIMULATED fixture for that gate only, badge flips to `SIMULATED (fallback)` per step · Web Speech unavailable → text input · mic denied → text input · empty transcript → blocked with hint · rate-limited → countdown message.

## 6. File map

```
lib/cage/client.ts        OpenAI-compatible fetch wrapper (timeout, retry, json_schema)
lib/cage/schemas.ts       zod schemas for all 4 gates + fallback factories
lib/cage/prompts.ts       system contracts (delimited untrusted transcript block)
lib/retrieval.ts          BM25 over mock directory (code-only routing)
data/mock-directory.json  ~50 PAs (pa_code, name, ministry, keywords[], snapshot_date)
app/api/agent/{notes,guard,draft,explain}/route.ts
hooks/useSpeech.ts        Web Speech wrapper (interim results, lang, errors)
app/demo/page.tsx         rebuilt stage machine (real mic + real calls)
```

## 7. Build order

1. mock-directory.json + lib/retrieval.ts (pure code, testable)
2. cage client + schemas + prompts; 4 API routes with fixtures as fallback
3. useSpeech hook + mic stage UI (works in SIMULATED with no key)
4. Wire gates 1→4 into the stage machine; missing-detail loop
5. Departments + finish flow on live data; badges everywhere
6. Failure drills: kill key mid-run, deny mic, feed injection attempt in speech ("ignore previous instructions…"), non-Latin script, 3,000-char overrun

## 8. Acceptance checks

- With key: real spoken Hindi → real draft → real 3 explained departments, end-to-end < 60s.
- Without key: identical UX, SIMULATED badges, deterministic fixtures.
- Injection attempt in speech changes nothing (transcript echoed, rules intact).
- EXEMPT ask → no draft call fired (network tab proves it).
- No key/material in any browser payload; only edited transcript text leaves the device.

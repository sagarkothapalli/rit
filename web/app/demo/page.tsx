"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import SiteMasthead from "@/components/SiteMasthead";
import { useSpeech } from "@/hooks/useSpeech";
import { searchDirectory, shortlistDirectory, DIRECTORY, DIRECTORY_SNAPSHOT, PORTAL_TOTAL, type PublicAuthority } from "@/lib/retrieval";
import {
  draftFallback,
  explainFallback,
  guardFallback,
  notesFallback,
  type Notes,
  type Guard,
  type Draft,
} from "@/lib/cage/schemas";
import { normalizeNotes, routingQuery } from "@/lib/intake";
import { hostedGate } from "@/lib/cage/hosted";
import { buildReport, downloadText, formatReportText, reportFilename } from "@/lib/report";

/* ============================================================
   Drafting workspace. Live microphone through Web Speech and
   four server side model gates with deterministic fallbacks.
   Citizens remain in control at every consequential step.
   ============================================================ */

type Stage =
  | "setup"
  | "record"
  | "notes"
  | "guard"
  | "draft"
  | "departments"
  | "otp"
  | "pay"
  | "receipt";

const STAGE_LABELS: Record<Stage, string> = {
  setup: "Setup",
  record: "Speak",
  notes: "Notes",
  guard: "Guard",
  draft: "Draft",
  departments: "Department",
  otp: "Verify",
  pay: "Prepare",
  receipt: "Receipt",
};

const LANGUAGES = [
  { code: "en-IN", label: "English" },
  { code: "hi-IN", label: "हिन्दी Hindi" },
  { code: "ta-IN", label: "தமிழ் Tamil" },
  { code: "te-IN", label: "తెలుగు Telugu" },
  { code: "bn-IN", label: "বাংলা Bengali" },
  { code: "mr-IN", label: "मराठी Marathi" },
  { code: "gu-IN", label: "ગુજરાતી Gujarati" },
  { code: "kn-IN", label: "ಕನ್ನಡ Kannada" },
  { code: "ml-IN", label: "മലയാളം Malayalam" },
  { code: "pa-IN", label: "ਪੰਜਾਬੀ Punjabi" },
  { code: "or-IN", label: "ଓଡ଼ିଆ Odia" },
  { code: "ur-IN", label: "اردو Urdu" },
];

type Mode = "LIVE" | "SIMULATED";
const gateModes: Partial<Record<"notes" | "guard" | "draft" | "explain", Mode>> = {};

function spokenTranscript(finalText: string, interimText: string) {
  return [finalText, interimText].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function localFallback(url: string, body: unknown): unknown {
  if (url.endsWith("/notes")) {
    const request = body as { transcript?: string };
    const transcript = request.transcript ?? "";
    return { mode: "SIMULATED", data: normalizeNotes(transcript, notesFallback(transcript)) };
  }
  if (url.endsWith("/guard")) return { mode: "SIMULATED", data: guardFallback };
  if (url.endsWith("/draft")) {
    const request = body as { notes: Notes };
    return { mode: "SIMULATED", data: draftFallback(request.notes) };
  }
  if (url.endsWith("/explain")) {
    const request = body as { notes: Notes; transcript?: string; draft?: Draft };
    const query = routingQuery({
      transcript: request.transcript,
      notes: request.notes,
      draft: request.draft,
    });
    const { results, reviewRequired } = shortlistDirectory(query, 16);
    const retrieved = results.slice(0, 3).map((result) => ({
      id: result.pa.pa_code,
      name: result.pa.name,
      ministry: result.pa.ministry,
      matched: result.matched.slice(0, 6),
      score: Math.round(result.score * 100) / 100,
    }));
    return {
      mode: "SIMULATED",
      data: explainFallback(retrieved),
      directory: { snapshot: DIRECTORY_SNAPSHOT, count: DIRECTORY.length, portal_total: PORTAL_TOTAL },
      review_required: reviewRequired || retrieved.length === 0,
      retrieved,
    };
  }
  throw new Error("This service is temporarily unavailable.");
}

function onStaticHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host.endsWith(".here.now") || host === "here.now";
}

function looksLikeJson(res: Response): boolean {
  const type = res.headers.get("content-type") ?? "";
  return type.includes("application/json") || type.includes("+json");
}

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  if (!onStaticHost()) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok && looksLikeJson(res)) return (await res.json()) as T;
    } catch {
      // Fall through to the hosted Gemini proxy, then to local fallbacks.
    }
  }
  try {
    return (await hostedGate(url, body)) as T;
  } catch {
    // Proxy or model unavailable — same deterministic local path as no-key mode.
  }
  return localFallback(url, body) as T;
}

interface NotesResp { mode: Mode; model?: string; data: Notes }
interface GuardResp { mode: Mode; model?: string; data: Guard }
interface DraftResp { mode: Mode; model?: string; data: Draft }
interface ExplainCandidate { id: string; why: string; caveat: string }
interface RetrievedPA { id: string; name: string; ministry: string; matched: string[]; score: number }
interface ExplainResp {
  mode: Mode;
  model?: string;
  data?: { candidates: ExplainCandidate[] };
  retrieved?: RetrievedPA[];
  review_required?: boolean;
  directory?: { snapshot: string; count: number };
}

export default function DraftingPage() {
  const [stage, setStage] = useState<Stage>("setup");
  const [lang, setLang] = useState("en-IN");
  const [manualText, setManualText] = useState("");
  const [userCorrected, setUserCorrected] = useState(false);
  const [correctOpen, setCorrectOpen] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [notes, setNotes] = useState<Notes | null>(null);
  const [guard, setGuard] = useState<Guard | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [candidates, setCandidates] = useState<ExplainCandidate[]>([]);
  const [retrieved, setRetrieved] = useState<RetrievedPA[]>([]);
  const [reviewRequired, setReviewRequired] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [otp, setOtp] = useState("");
  const [reference] = useState(() => `PRTI 2026 ${Math.floor(100000 + Math.random() * 899999)}`);
  const [pressed, setPressed] = useState(false);
  const [busy, setBusy] = useState<null | "notes" | "guard" | "draft" | "explain">(null);
  const [predicting, setPredicting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [anySimulated, setAnySimulated] = useState(false);
  const [copied, setCopied] = useState<"txt" | "json" | null>(null);

  const speech = useSpeech(lang);
  const micMode = speech.supported ? "Web Speech" : "Text only";
  const spokenText = spokenTranscript(speech.finalText, speech.interimText);
  const correction = userCorrected ? manualText : spokenText || manualText;
  const listening = speech.status === "listening";

  const liveModel = !anySimulated && Object.values(gateModes).some((m) => m === "LIVE");

  const stageIndex = Object.keys(STAGE_LABELS).indexOf(stage);

  const searchResults: PublicAuthority[] = useMemo(() => {
    if (!searchQ.trim()) return [];
    return searchDirectory(searchQ, 5).results.map((r) => r.pa);
  }, [searchQ]);

  function recordMode(gate: "notes" | "guard" | "draft" | "explain", mode: Mode) {
    gateModes[gate] = mode;
    if (mode === "SIMULATED") setAnySimulated(true);
  }

  function goSetup() {
    setStage("record");
    speech.reset();
    setManualText("");
    setUserCorrected(false);
    setCorrectOpen(false);
    setErr(null);
  }

  function takeOverCorrection(next = spokenText || manualText) {
    if (!userCorrected) {
      setManualText(next);
      setUserCorrected(true);
    }
  }

  function startListening() {
    if (userCorrected) {
      speech.setFinalText(manualText.trim());
      setUserCorrected(false);
    }
    setErr(null);
    speech.start();
  }

  function stopListening() {
    speech.stop();
    if (!userCorrected) {
      const snapshot = spokenText || manualText;
      if (snapshot) {
        setManualText(snapshot);
        setUserCorrected(true);
      }
    }
    if (spokenText || manualText) setCorrectOpen(true);
  }

  function finishRecording() {
    speech.stop();
    const final = correction.trim();
    if (!final) {
      setErr("Nothing recorded yet. Speak or type your concern below.");
      return;
    }
    setErr(null);
    setTranscript(final);
    runNotes(final);
  }

  async function runNotes(text: string) {
    setBusy("notes");
    setErr(null);
    try {
      const r = await postJSON<NotesResp>("/api/agent/notes", { transcript: text, lang });
      recordMode("notes", r.mode);
      setNotes(r.data);
      setCandidates([]);
      setRetrieved([]);
      setStage("notes");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not reach the agent.");
    } finally {
      setBusy(null);
    }
  }

  async function applyExplain(r: ExplainResp) {
    recordMode("explain", r.mode ?? "SIMULATED");
    setRetrieved(r.retrieved ?? []);
    setReviewRequired(Boolean(r.review_required) && (r.data?.candidates.length ?? 0) === 0);
    setCandidates(r.data?.candidates ?? []);
    setPicked(null);
  }

  async function runExplain(n: Notes, d?: Draft | null) {
    const r = await postJSON<ExplainResp>("/api/agent/explain", {
      notes: n,
      transcript,
      draft: d ?? undefined,
    });
    applyExplain(r);
    return r;
  }

  async function prefetchExplain(n: Notes, d: Draft) {
    setPredicting(true);
    setErr(null);
    try {
      await runExplain(n, d);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Routing failed.");
    } finally {
      setPredicting(false);
    }
  }

  async function confirmNotes() {
    if (!notes) return;
    setBusy("guard");
    setErr(null);
    try {
      const r = await postJSON<GuardResp>("/api/agent/guard", { notes });
      recordMode("guard", r.mode);
      setGuard(r.data);
      setStage("guard");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Guard check failed.");
    } finally {
      setBusy(null);
    }
  }

  async function proceedToDraft() {
    if (!notes) return;
    setBusy("draft");
    setErr(null);
    try {
      const r = await postJSON<DraftResp>("/api/agent/draft", { notes });
      recordMode("draft", r.mode);
      setDraft(r.data);
      setCandidates([]);
      setRetrieved([]);
      setStage("draft");
      void prefetchExplain(notes, r.data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Drafting failed.");
    } finally {
      setBusy(null);
    }
  }

  async function explainRoute() {
    if (!notes) return;
    if (candidates.length > 0) {
      setStage("departments");
      return;
    }
    setBusy("explain");
    setErr(null);
    try {
      await runExplain(notes, draft);
      setStage("departments");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Routing failed.");
    } finally {
      setBusy(null);
    }
  }

  function reframe() {
    if (!guard?.safe_reframing) return;
    const t = `${transcript}\n[Reframed ask] ${guard.safe_reframing}`;
    setTranscript(t);
    setGuard(null);
    runNotes(t);
  }

  const draftCharCount = draft ? draft.requests.join(" ").length : 0;

  const nameOf = (id: string) => retrieved.find((r) => r.id === id)?.name ?? id;
  const ministryOf = (id: string) => retrieved.find((r) => r.id === id)?.ministry ?? "";

  const report = buildReport({
    reference,
    transcript,
    notes,
    draft,
    authorityName: picked ? nameOf(picked) : "Not selected",
    ministry: picked ? ministryOf(picked) : "",
  });
  const reportText = formatReportText(report);

  async function copyReport(kind: "txt" | "json") {
    const payload = kind === "json" ? JSON.stringify(report, null, 2) : reportText;
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setErr("Could not copy. Download the report instead.");
    }
  }

  function saveReport(kind: "txt" | "json") {
    if (kind === "json") {
      downloadText(reportFilename(reference, "json"), JSON.stringify(report, null, 2), "application/json");
      return;
    }
    downloadText(reportFilename(reference, "txt"), reportText, "text/plain;charset=utf-8");
  }

  return (
    <main className="relative min-h-screen flex flex-col bg-[var(--bg)]">
      <SiteMasthead
        compact
        notice="Only edited transcript text is analysed. Audio is not sent."
        links={
          <>
            <Link href="/admin">Service settings</Link>
            <a href="https://rtionline.gov.in/" rel="noreferrer" target="_blank">Official RTI portal</a>
          </>
        }
        truth={
          <>
            <strong>Important:</strong> This workspace prepares a draft. It does not file with or connect to a government system.
          </>
        }
      >
        <Link href="/" className="header-action request-home-action">Back to home</Link>
      </SiteMasthead>

      {/* Mode badges */}
      <div className="mx-auto max-w-5xl px-6 pt-4 flex flex-wrap items-center gap-2" id="main-content">
        <span className={`inline-flex items-center rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] ${speech.supported ? "border-[var(--iris)]/25 bg-[var(--iris-tint)] text-[var(--iris)]" : "border-[var(--line-strong)] text-[var(--fg-faint)]"}`}>
          Voice: {micMode}
        </span>
        <span className={`inline-flex items-center rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] ${liveModel ? "border-[var(--green)]/30 bg-[var(--green)]/10 text-[var(--green)]" : "border-[var(--amber)]/30 bg-[var(--amber)]/10 text-[var(--amber)]"}`}>
          Processing: {liveModel ? "Live service" : anySimulated ? "Local fallback" : "Ready"}
        </span>
        <span className="inline-flex items-center rounded-md border border-[var(--line)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--fg-faint)]">
          Directory: {DIRECTORY.length} / {PORTAL_TOTAL} · {DIRECTORY_SNAPSHOT}
        </span>
      </div>

      {/* Stage tabs */}
      <ol className="mx-auto max-w-5xl w-full px-6 pt-4 flex flex-wrap items-end gap-1.5" role="list">
        {(Object.keys(STAGE_LABELS) as Stage[]).map((s, i) => {
          const active = s === stage;
          const done = i < stageIndex;
          return (
            <li
              key={s}
              className={`tab ${active ? "tab-active" : done ? "opacity-90" : "opacity-55"}`}
              aria-current={active ? "step" : undefined}
            >
              <span className="mr-2 opacity-70">{String(i + 1).padStart(2, "0")}</span>
              {STAGE_LABELS[s]}
            </li>
          );
        })}
      </ol>

      {/* Body */}
      <section className="flex-1">
        <div className="mx-auto max-w-5xl px-6 py-10 grid md:grid-cols-12 gap-8 items-start">
          {/* Main paper */}
          <div className="md:col-span-8">
            <article key={stage} className="paper page-turn-in px-6 md:px-10 py-9">
              {/* ---------- SETUP ---------- */}
              {stage === "setup" && (
                <div>
                  <h1 className="font-display text-[28px] md:text-[32px] font-medium leading-[1.1] tracking-tight mb-3">
                    Speak in your language. The console takes notes.
                  </h1>
                  <p className="text-[15px] text-[var(--fg-soft)] leading-relaxed mb-7 max-w-[58ch]">
                    Pick your language, allow the microphone, and just talk. A complaint, a rant, or half a
                    thought. You will see every word recognised, and you can correct it before anything
                    is analysed.
                  </p>

                  <div className="mb-6">
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-faint)] mb-2">
                      I will speak in
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {LANGUAGES.map((l) => (
                        <button
                          key={l.code}
                          type="button"
                          onClick={() => setLang(l.code)}
                          className={`rounded-lg border px-3.5 py-1.5 text-[13px] transition-all ${lang === l.code ? "border-[var(--iris)] bg-[var(--iris-tint)] text-[var(--iris)] font-medium" : "border-[var(--line-strong)] text-[var(--fg-soft)] hover:border-[var(--iris)]/40"}`}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                    {!speech.supported && (
                      <p className="mt-3 text-[13px] text-[var(--amber)]">
                        This browser does not support live speech recognition. You can still type your
                        concern in the next step. Everything else still works.
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={goSetup}
                    className="brass-plate px-6 py-3 font-mono text-[12px] uppercase tracking-[0.08em] transition-all"
                  >
                    Allow mic &amp; continue
                  </button>
                </div>
              )}

              {/* ---------- RECORD ---------- */}
              {stage === "record" && (
                <div>
                  <h1 className="font-display text-[28px] md:text-[32px] font-medium leading-[1.1] tracking-tight mb-2">
                    {listening ? "Listening. Speak naturally..." : "Ready when you are."}
                  </h1>
                  <p className="text-[14px] text-[var(--fg-soft)] mb-6">
                    Language: <span className="font-medium text-[var(--fg)]">{LANGUAGES.find((l) => l.code === lang)?.label}</span>
                    {" · "}Tap the mic again to stop.
                  </p>

                  <div className="flex items-center gap-5 mb-6">
                    <button
                      type="button"
                      onClick={listening ? stopListening : startListening}
                      disabled={!speech.supported}
                      aria-label={listening ? "Stop listening" : "Start listening"}
                      className={`brass size-[76px] grid place-items-center rounded-full transition-all duration-200 ${listening ? "scale-105 shadow-[0_0_0_8px_rgba(8,47,91,0.10)]" : ""} ${!speech.supported ? "opacity-40 cursor-not-allowed" : "hover:scale-[1.04] active:scale-[0.97]"}`}
                    >
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        {listening ? (
                          <rect x="6" y="6" width="12" height="12" rx="2" />
                        ) : (
                          <>
                            <rect x="9" y="3" width="6" height="12" rx="3" />
                            <path d="M5 11a7 7 0 0 0 14 0" />
                            <path d="M12 18v3" />
                          </>
                        )}
                      </svg>
                    </button>
                    <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-faint)]">
                      {listening ? "Recording. Tap to stop" : speech.supported ? "Tap the mic to talk" : "Speech unsupported. Type below"}
                    </div>
                  </div>

                  {speech.error && (
                    <p className="mb-4 rounded-xl border border-[var(--red)]/25 bg-[var(--red)]/[0.04] px-4 py-3 text-[13.5px] text-[var(--red)]">
                      {speech.error}
                    </p>
                  )}

                  {/* Live transcript */}
                  <div className="rounded-xl border border-[var(--line)] bg-[var(--glass-faint)] px-5 py-4 min-h-[110px] mb-5" aria-live="polite">
                    {listening && (speech.finalText || speech.interimText) ? (
                      <p className="text-[15px] leading-[1.65] text-[var(--fg)]">
                        {speech.finalText}
                        {speech.interimText ? (
                          <span className="text-[var(--fg-faint)]"> {speech.interimText}</span>
                        ) : null}
                      </p>
                    ) : correction ? (
                      <p className="text-[15px] leading-[1.65] text-[var(--fg)]">{correction}</p>
                    ) : (
                      <p className="text-[15px] italic text-[var(--fg-faint)]">
                        Recognised words will appear here…
                      </p>
                    )}
                  </div>

                  {/* Editable copy of the live transcript */}
                  <details
                    className="mb-6 group"
                    open={correctOpen || !speech.supported}
                    onToggle={(e) => setCorrectOpen((e.currentTarget as HTMLDetailsElement).open)}
                  >
                    <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-faint)] hover:text-[var(--fg-soft)] select-none">
                      {speech.supported
                        ? correction
                          ? "Correct the transcript ▾"
                          : "Type or correct instead ▾"
                        : "Type your complaint ▾"}
                    </summary>
                    <textarea
                      value={correction}
                      onChange={(e) => {
                        setUserCorrected(true);
                        setManualText(e.target.value);
                      }}
                      onFocus={() => {
                        if (listening) stopListening();
                        else takeOverCorrection();
                      }}
                      rows={4}
                      placeholder="Type in any language…"
                      className="mt-3 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--glass-strong)] px-4 py-3 text-[15px] leading-relaxed outline-none focus:border-[var(--iris)] focus:ring-4 focus:ring-[var(--iris)]/10"
                    />
                  </details>

                  {err && <p className="mb-4 text-[13.5px] text-[var(--red)]">{err}</p>}

                  <button
                    type="button"
                    onClick={finishRecording}
                    disabled={busy === "notes"}
                    className={`brass-plate px-6 py-3 font-mono text-[12px] uppercase tracking-[0.18em] transition-all ${busy === "notes" ? "opacity-60" : ""}`}
                  >
                    {busy === "notes" ? "Reading your words…" : "Send to the agent →"}
                  </button>
                </div>
              )}

              {/* ---------- NOTES ---------- */}
              {stage === "notes" && notes && (
                <div>
                  <h1 className="font-display text-[28px] md:text-[32px] font-medium leading-[1.1] tracking-tight mb-2">
                    Here is what I understood.
                  </h1>
                  <p className="text-[14px] text-[var(--fg-soft)] mb-6">
                    Your rant was turned into the records an RTI can actually ask for. Nothing extra was asked of you.
                    Correct anything before the console drafts your application.
                  </p>

                  <div className="space-y-3 mb-6">
                    <NoteChip
                      label="Records sought"
                      values={notes.records_sought}
                      empty="None identified"
                    />
                    <NoteChip label="Period" values={notes.date_range ? [notes.date_range] : []} empty="Not stated" />
                    <NoteChip label="Place" values={notes.place ? [notes.place] : []} empty="Not stated" />
                    <NoteChip label="Likely authority" values={notes.body_hint ? [notes.body_hint] : []} empty="To be predicted next" />
                    <NoteChip label="Format" values={[notes.format]} empty="" />
                  </div>

                  {err && <p className="mb-4 text-[13.5px] text-[var(--red)]">{err}</p>}

                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={confirmNotes} disabled={busy === "guard"} className={`brass-plate px-5 py-2.5 font-mono text-[12px] uppercase tracking-[0.16em] ${busy === "guard" ? "opacity-60" : ""}`}>
                      {busy === "guard" ? "Checking exemptions..." : "Looks right. Check exemptions →"}
                    </button>
                    <button type="button" onClick={() => setStage("record")} className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-faint)] hover:text-[var(--fg-soft)]">
                      Record again
                    </button>
                  </div>
                </div>
              )}

              {/* ---------- GUARD ---------- */}
              {stage === "guard" && guard && (
                <div>
                  {guard.verdict === "ALLOWED" ? (
                    <>
                      <h1 className="font-display text-[28px] md:text-[32px] font-medium leading-[1.1] tracking-tight mb-3">
                        No exemption blocks this ask.
                      </h1>
                      <div className="rounded-xl border border-[var(--green)]/25 bg-[var(--green)]/[0.05] px-5 py-4 mb-6">
                        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--green)] mb-1.5">
                          Exemption review | allowed
                        </div>
                        <p className="text-[14.5px] leading-relaxed text-[var(--fg-soft)]">{guard.reason_summary}</p>
                      </div>
                      <button type="button" onClick={proceedToDraft} disabled={busy === "draft"} className={`brass-plate px-5 py-2.5 font-mono text-[12px] uppercase tracking-[0.16em] ${busy === "draft" ? "opacity-60" : ""}`}>
                        {busy === "draft" ? "Drafting…" : "Draft the application →"}
                      </button>
                    </>
                  ) : (
                    <>
                      <h1 className="font-display text-[28px] md:text-[32px] font-medium leading-[1.1] tracking-tight mb-3">
                        The console will not draft this.
                      </h1>
                      <div className="rounded-xl border border-[var(--red)]/25 bg-[var(--red)]/[0.04] px-5 py-4 mb-6">
                        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--red)] mb-1.5">
                          {guard.clause ? `Exempt · Section ${guard.clause}` : "Exempt under the RTI Act"}
                        </div>
                        <p className="text-[14.5px] leading-relaxed text-[var(--fg-soft)] mb-3">{guard.reason_summary}</p>
                        {guard.safe_reframing && (
                          <p className="text-[13.5px] leading-relaxed text-[var(--fg-soft)]">
                            <span className="font-medium text-[var(--fg)]">Lawful reframing: </span>
                            {guard.safe_reframing}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {guard.safe_reframing && (
                          <button type="button" onClick={reframe} disabled={busy === "notes"} className="brass-plate px-5 py-2.5 font-mono text-[12px] uppercase tracking-[0.16em]">
                            {busy === "notes" ? "…" : "Use the lawful reframing →"}
                          </button>
                        )}
                        <button type="button" onClick={() => setStage("record")} className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-faint)] hover:text-[var(--fg-soft)]">
                          ← Start over
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ---------- DRAFT ---------- */}
              {stage === "draft" && draft && (
                <div>
                  <h1 className="font-display text-[28px] md:text-[32px] font-medium leading-[1.1] tracking-tight mb-2">
                    Your RTI application, ready to edit.
                  </h1>
                  <p className="text-[14px] text-[var(--fg-soft)] mb-6">
                    Every line is yours to change. The official portal allows 3,000 characters.
                    Longer requests can be added as a PDF attachment.
                  </p>

                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-faint)] mb-2">
                    {draft.title}
                  </div>

                  <div className="space-y-3 mb-4">
                    {draft.requests.map((r, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="font-display text-[var(--fg-faint)] pt-0.5">{i + 1}.</span>
                        <textarea
                          value={r}
                          rows={2}
                          onChange={(e) => {
                            const next = { ...draft, requests: draft.requests.map((x, j) => (j === i ? e.target.value : x)) };
                            setDraft(next);
                          }}
                          className="flex-1 rounded-xl border border-[var(--line)] bg-[var(--glass)] px-4 py-2.5 text-[14.5px] leading-relaxed outline-none focus:border-[var(--iris)] focus:ring-4 focus:ring-[var(--iris)]/10 resize-y"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mb-6">
                    <span className="font-mono text-[11px] text-[var(--fg-faint)]">
                      {draftCharCount} / 3,000 characters {draftCharCount > 3000 && <span className="text-[var(--red)]">· over the limit, trim or attach a PDF</span>}
                    </span>
                  </div>

                  {(predicting || retrieved.length > 0) && (
                    <div className="rounded-xl border border-[var(--line)] bg-[var(--glass-faint)] px-5 py-4 mb-6">
                      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-faint)] mb-2">
                        Predicted desks
                      </div>
                      {predicting && retrieved.length === 0 ? (
                        <p className="text-[13.5px] text-[var(--fg-soft)]">Comparing your draft with the RTI directory…</p>
                      ) : (
                        <p className="text-[13.5px] leading-relaxed text-[var(--fg)]">
                          {retrieved.slice(0, 3).map((item) => item.name).join(" · ") || "Still matching…"}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={explainRoute}
                      disabled={busy === "explain" || predicting || draftCharCount > 3000}
                      className={`brass-plate px-5 py-2.5 font-mono text-[12px] uppercase tracking-[0.16em] ${busy === "explain" || predicting || draftCharCount > 3000 ? "opacity-60" : ""}`}
                    >
                      {busy === "explain" || predicting ? "Finding the right desk…" : "Review predicted departments →"}
                    </button>
                    <button type="button" onClick={() => copyReport("txt")} className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-faint)] hover:text-[var(--fg-soft)]">
                      {copied === "txt" ? "Copied requests" : "Copy requests"}
                    </button>
                    <button type="button" onClick={() => saveReport("txt")} className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-faint)] hover:text-[var(--fg-soft)]">
                      Download .txt
                    </button>
                    <button type="button" onClick={() => setStage("notes")} className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-faint)] hover:text-[var(--fg-soft)]">
                      ← Edit notes
                    </button>
                  </div>
                </div>
              )}

              {/* ---------- DEPARTMENTS ---------- */}
              {stage === "departments" && (
                <div>
                  <h1 className="font-display text-[28px] md:text-[32px] font-medium leading-[1.1] tracking-tight mb-2">
                    {candidates.length > 0 ? "Three predicted departments." : "No confident match in the directory."}
                  </h1>
                  <p className="text-[14px] text-[var(--fg-soft)] mb-6">
                    Compared against a dated snapshot of the RTI Online listing ({PORTAL_TOTAL} public
                    authorities; {DIRECTORY.length} in this file). A local search shortlists 16; the model
                    ranks the three best. You still choose.
                  </p>

                  {notes?.is_state_matter && (
                    <div className="rounded-xl border border-[var(--amber)]/30 bg-[var(--amber)]/[0.06] px-5 py-4 mb-6">
                      <p className="text-[14px] text-[var(--fg-soft)]">
                        This looks like a State or local-body matter{notes.state_name ? ` (${notes.state_name})` : ""}.
                        The Central RTI Online portal does not take State RTIs. The three desks below are Central
                        matches only.
                      </p>
                    </div>
                  )}

                  {reviewRequired && (
                    <div className="rounded-xl border border-[var(--amber)]/30 bg-[var(--amber)]/[0.06] px-5 py-4 mb-6">
                      <p className="text-[14px] text-[var(--fg-soft)]">
                        Nothing matched confidently. Search the directory yourself, or reword the ask.
                      </p>
                    </div>
                  )}

                  <div className="space-y-3 mb-6">
                    {candidates.map((c, i) => {
                      const active = picked === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setPicked(c.id)}
                          className={`w-full text-left rounded-xl border px-5 py-4 transition-all duration-150 ${active ? "border-[var(--iris)] bg-[var(--iris-tint)] ring-4 ring-[var(--iris)]/10" : "border-[var(--line)] bg-[var(--glass)] hover:border-[var(--iris)]/40"}`}
                        >
                          <div className="flex items-baseline justify-between gap-3 mb-1">
                            <span className="font-display text-[16px] font-medium text-[var(--fg)]">{nameOf(c.id)}</span>
                            <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[var(--fg-faint)] shrink-0">
                              {i === 0 ? "1st" : i === 1 ? "2nd" : "3rd"} prediction
                            </span>
                          </div>
                          <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[var(--fg-faint)] mb-2">
                            {ministryOf(c.id)}
                          </div>
                          <p className="text-[13.5px] leading-relaxed text-[var(--fg-soft)]">{c.why}</p>
                          <p className="text-[12.5px] italic leading-relaxed text-[var(--fg-faint)] mt-1">{c.caveat}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Manual search / override */}
                  <div className="rounded-xl border border-[var(--line)] bg-[var(--glass-faint)] px-5 py-4 mb-6">
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-faint)] mb-2">
                      Search the directory yourself
                    </div>
                    <input
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                      placeholder="passport, pf, income tax, aadhaar…"
                      className="w-full rounded-lg border border-[var(--line-strong)] bg-[var(--glass-strong)] px-4 py-2 text-[14px] outline-none focus:border-[var(--iris)] focus:ring-4 focus:ring-[var(--iris)]/10"
                    />
                    {searchResults.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {searchResults.map((p) => (
                          <button
                            key={p.pa_code}
                            type="button"
                            onClick={() => {
                              setPicked(p.pa_code);
                              if (!retrieved.find((r) => r.id === p.pa_code)) {
                                setRetrieved((prev) => [...prev, { id: p.pa_code, name: p.name, ministry: p.ministry, matched: [], score: 1 }]);
                              }
                            }}
                            className={`rounded-lg border px-3 py-1.5 text-[12.5px] transition-all ${picked === p.pa_code ? "border-[var(--iris)] bg-[var(--iris-tint)] text-[var(--iris)]" : "border-[var(--line-strong)] text-[var(--fg-soft)] hover:border-[var(--iris)]/40"}`}
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {err && <p className="mb-4 text-[13.5px] text-[var(--red)]">{err}</p>}

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => picked && setStage("otp")}
                      disabled={!picked}
                      className={`brass-plate px-5 py-2.5 font-mono text-[12px] uppercase tracking-[0.16em] ${!picked ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      Continue with {picked ? `"${nameOf(picked).slice(0, 34)}${nameOf(picked).length > 34 ? "…" : ""}"` : "a selection"} →
                    </button>
                    <button type="button" onClick={() => setStage("draft")} className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-faint)] hover:text-[var(--fg-soft)]">
                      ← Edit draft
                    </button>
                  </div>
                </div>
              )}

              {/* ---------- OTP ---------- */}
              {stage === "otp" && (
                <div>
                  <h1 className="font-display text-[28px] md:text-[32px] font-medium leading-[1.1] tracking-tight mb-2">
                    Verify it is really you.
                  </h1>
                  <p className="text-[14px] text-[var(--fg-soft)] mb-6">
                    A local verification code is shown because no SMS service is connected. Use{" "}
                    <span className="font-mono font-semibold text-[var(--fg)]">123456</span>.
                  </p>
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    placeholder="••••••"
                    className="w-44 rounded-xl border border-[var(--line-strong)] bg-[var(--glass-strong)] px-4 py-3 text-center font-mono text-[22px] tracking-[0.35em] outline-none focus:border-[var(--iris)] focus:ring-4 focus:ring-[var(--iris)]/10 mb-4"
                  />
                  {err && <p className="mb-4 text-[13.5px] text-[var(--red)]">{err}</p>}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (otp === "123456") {
                          setErr(null);
                          setStage("pay");
                        } else {
                          setErr("Wrong code. Use the local verification code 123456.");
                        }
                      }}
                      disabled={otp.length !== 6}
                      className={`brass-plate px-5 py-2.5 font-mono text-[12px] uppercase tracking-[0.16em] ${otp.length !== 6 ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      Verify →
                    </button>
                    <button type="button" onClick={() => setStage("departments")} className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-faint)] hover:text-[var(--fg-soft)]">
                      ← Back
                    </button>
                  </div>
                </div>
              )}

              {/* ---------- PAY ---------- */}
              {stage === "pay" && (
                <div>
                  <h1 className="font-display text-[28px] md:text-[32px] font-medium leading-[1.1] tracking-tight mb-2">
                    Prepare your application summary.
                  </h1>
                  <p className="text-[14px] text-[var(--fg-soft)] mb-6">
                    Review the selected authority before creating a preparation receipt. No payment or filing happens in this workspace.
                  </p>

                  <div className="rounded-xl border border-[var(--line)] bg-[var(--glass)] px-5 py-4 mb-6">
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-faint)] mb-2">
                      Preparing for
                    </div>
                    <div className="font-display text-[16px] text-[var(--fg)]">{picked ? nameOf(picked) : "Not selected"}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-faint)] mt-1">
                      {picked ? ministryOf(picked) : ""}
                    </div>
                    <div className="border-t border-[var(--line)] mt-3 pt-3 text-[13.5px] text-[var(--fg-soft)]">
                      Filing and any statutory payment are completed separately on the official RTI Online portal.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPressed(true);
                      window.setTimeout(() => setPressed(false), 500);
                      setStage("receipt");
                    }}
                    className={`brass-plate px-6 py-3 font-mono text-[12px] uppercase tracking-[0.18em] transition-all ${pressed ? "stamp-press" : ""}`}
                  >
                    Prepare review receipt
                  </button>
                </div>
              )}

              {/* ---------- RECEIPT ---------- */}
              {stage === "receipt" && (
                <div>
                  <h1 className="font-display text-[28px] md:text-[32px] font-medium leading-[1.1] tracking-tight mb-2">
                    Prepared. Not filed.
                  </h1>
                  <p className="text-[14px] text-[var(--fg-soft)] mb-6">
                    This preparation receipt confirms your work here. It was not sent to a government system.
                  </p>

                  <div className="rounded-xl border border-[var(--line)] bg-[var(--glass-strong)] px-6 py-6 mb-6 relative">
                    <div className={`absolute -top-3.5 right-5 wax px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em]`}>
                      Not submitted
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-faint)] mb-2">
                      Praja RTI | independent preparation receipt
                    </div>
                    <div className="font-display text-[20px] font-medium mb-4">{reference}</div>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13.5px]">
                      <div>
                        <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-faint)] mb-0.5">Authority</dt>
                        <dd className="text-[var(--fg)]">{picked ? nameOf(picked) : "Not available"}</dd>
                      </div>
                      <div>
                        <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-faint)] mb-0.5">Workspace</dt>
                        <dd className="text-[var(--fg)]">No payment processed</dd>
                      </div>
                      <div>
                        <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-faint)] mb-0.5">Requests</dt>
                        <dd className="text-[var(--fg)]">{draft?.requests.length ?? "Not available"}</dd>
                      </div>
                      <div>
                        <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-faint)] mb-0.5">Submission</dt>
                        <dd className="text-[var(--red)] font-medium">NOT_SUBMITTED</dd>
                      </div>
                    </dl>
                    {draft && draft.requests.length > 0 && (
                      <ol className="mt-5 border-t border-[var(--line)] pt-4 space-y-2.5">
                        <li className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-faint)] list-none">
                          {draft.title}
                        </li>
                        {draft.requests.map((item, i) => (
                          <li key={i} className="text-[13.5px] leading-relaxed text-[var(--fg)] pl-1">
                            <span className="font-display text-[var(--fg-faint)] mr-2">{i + 1}.</span>
                            {item}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <button type="button" onClick={() => copyReport("txt")} className="brass-plate px-5 py-2.5 font-mono text-[12px] uppercase tracking-[0.16em]">
                      {copied === "txt" ? "Copied" : "Copy requests"}
                    </button>
                    <button type="button" onClick={() => saveReport("txt")} className="brass-plate px-5 py-2.5 font-mono text-[12px] uppercase tracking-[0.16em]">
                      Download .txt
                    </button>
                    <button type="button" onClick={() => saveReport("json")} className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-faint)] hover:text-[var(--fg-soft)]">
                      Download JSON
                    </button>
                    <button type="button" onClick={() => copyReport("json")} className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-faint)] hover:text-[var(--fg-soft)]">
                      {copied === "json" ? "JSON copied" : "Copy JSON"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setStage("setup");
                      speech.reset();
                      setTranscript("");
                      setNotes(null);
                      setGuard(null);
                      setDraft(null);
                      setCandidates([]);
                      setRetrieved([]);
                      setPicked(null);
                      setPredicting(false);
                      setOtp("");
                      setManualText("");
                      setUserCorrected(false);
                      setCorrectOpen(false);
                      setAnySimulated(false);
                      Object.keys(gateModes).forEach((k) => delete gateModes[k as keyof typeof gateModes]);
                    }}
                    className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-faint)] hover:text-[var(--fg-soft)]"
                  >
                    Prepare another →
                  </button>
                </div>
              )}
            </article>
          </div>

          {/* Side rail */}
          <aside className="md:col-span-4 space-y-4">
            <div className="paper px-5 py-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-faint)] mb-2">
                How this works
              </div>
              <p className="text-[13.5px] leading-relaxed text-[var(--fg-soft)]">
                Your speech is recognised in the browser. Only the edited transcript is sent to four
                locked JSON jobs (notes, exemption check, drafting, explaining). Records, format, and a
                likely authority are inferred from the rant. Departments are ranked from a dated snapshot
                of the RTI Online listing — never invented.
              </p>
            </div>

            <div className="paper px-5 py-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-faint)] mb-3">
                Gate modes
              </div>
              <ul className="font-mono text-[11px] uppercase tracking-[0.14em] space-y-1.5">
                {(["notes", "guard", "draft", "explain"] as const).map((g) => (
                  <li key={g} className="flex items-center justify-between">
                    <span className="text-[var(--fg-soft)]">{g}</span>
                    <span className={gateModes[g] === "LIVE" ? "text-[var(--green)]" : gateModes[g] === "SIMULATED" ? "text-[var(--amber)]" : "text-[var(--fg-faint)]"}>
                      {gateModes[g] === "LIVE" ? "Live" : gateModes[g] === "SIMULATED" ? "Local" : "Pending"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="paper px-5 py-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-faint)] mb-2">
                Try the guardrail
              </div>
              <p className="text-[13.5px] leading-relaxed text-[var(--fg-soft)]">
                At the record stage, say something like{" "}
                <em>&ldquo;give me the minister&apos;s personal bank details&rdquo;</em>. The workspace
                refuses with the exact exemption clause and offers a lawful reframing.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function NoteChip({ label, values, empty }: { label: string; values: string[]; empty: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-faint)] w-36 shrink-0">
        {label}
      </span>
      {values.length > 0 ? (
        values.map((v) => (
          <span key={v} className="rounded-md border border-[var(--iris)]/25 bg-[var(--iris-tint)] px-3 py-1 text-[13px] text-[var(--fg)]">
            {v}
          </span>
        ))
      ) : (
        <span className="text-[13px] italic text-[var(--fg-faint)]">{empty}</span>
      )}
    </div>
  );
}

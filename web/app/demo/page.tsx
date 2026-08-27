"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SiteMasthead from "@/components/SiteMasthead";
import { useSpeech } from "@/hooks/useSpeech";
import { useLiveIntake } from "@/hooks/useLiveIntake";
import {
  searchDirectory,
  shortlistDirectory,
  DIRECTORY,
  DIRECTORY_RECONCILIATION,
  DIRECTORY_SNAPSHOT,
  PORTAL_TOTAL,
  type PublicAuthority,
} from "@/lib/retrieval";
import {
  draftFallback,
  explainFallback,
  guardFallback,
  notesFallback,
  type Notes,
  type Guard,
  type Draft,
  type IntakeHints,
} from "@/lib/cage/schemas";
import { loadIntakeRecord, clearIntakeRecord, composeIntakeTranscript } from "@/lib/live/intakeMemory";
import type { IntakeHandoff } from "@/lib/live/intakePrompt";
import { normalizeNotes, routingQuery } from "@/lib/intake";
import { hostedGate } from "@/lib/cage/hosted";
import { buildReport, downloadText, formatReportText, reportFilename } from "@/lib/report";
import {
  blobToBase64,
  downloadBlob,
  downloadPdfBase64,
  makeAcknowledgementNumber,
  saveApplication,
  type ApplicantDetails,
  type StoredApplication,
} from "@/lib/application-records";
import { createApplicationPdf, createReceiptPdf } from "@/lib/application-pdf";

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
  notes: "Intent",
  guard: "Guard",
  draft: "Application",
  departments: "Authority",
  otp: "Verify",
  pay: "Preview",
  receipt: "Acknowledgement",
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
    const request = body as { transcript?: string; intake?: IntakeHints };
    const transcript = request.transcript ?? "";
    return { mode: "SIMULATED", data: normalizeNotes(transcript, notesFallback(transcript), request.intake) };
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
      jurisdiction: result.pa.jurisdiction ?? "central",
      directory_status: result.pa.directory_status ?? "official-central-snapshot",
      filing_channel: result.pa.filing_channel ?? "RTI Online Central portal",
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
interface RetrievedPA {
  id: string;
  name: string;
  ministry: string;
  matched: string[];
  score: number;
  jurisdiction?: "central" | "state";
  directory_status?: "official-central-snapshot" | "curated-jurisdiction-rule";
  filing_channel?: string;
}
interface ExplainResp {
  mode: Mode;
  model?: string;
  data?: { candidates: ExplainCandidate[] };
  retrieved?: RetrievedPA[];
  review_required?: boolean;
  directory?: { snapshot: string; count: number; portal_total?: number };
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
  const [applicant, setApplicant] = useState<ApplicantDetails>({
    name: "",
    email: "",
    address: "",
    mobile: "",
    citizenship: "Indian",
    isBpl: false,
  });
  const [applicationPdf, setApplicationPdf] = useState<Blob | null>(null);
  const [savedApplication, setSavedApplication] = useState<StoredApplication | null>(null);
  const [storageMessage, setStorageMessage] = useState<string | null>(null);
  const [savingApplication, setSavingApplication] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [busy, setBusy] = useState<null | "notes" | "guard" | "draft" | "explain">(null);
  const [err, setErr] = useState<string | null>(null);
  const [anySimulated, setAnySimulated] = useState(false);
  const [copied, setCopied] = useState<"txt" | "json" | null>(null);
  const [advancing, setAdvancing] = useState(false);

  const speech = useSpeech(lang);
  const live = useLiveIntake();
  const [liveReady, setLiveReady] = useState(false);

  const applicationPdfUrl = useMemo(
    () => applicationPdf ? URL.createObjectURL(applicationPdf) : null,
    [applicationPdf],
  );

  useEffect(() => {
    return () => {
      if (applicationPdfUrl) URL.revokeObjectURL(applicationPdfUrl);
    };
  }, [applicationPdfUrl]);

  useEffect(() => {
    // Static hosted deploys have no token route — chips flow there.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLiveReady(live.supported && !onStaticHost());
  }, [live.supported]);

  // Restore a captured intake if the page was refreshed mid-flow: the
  // complaint is prefilled on the record stage, ready to send again.
  useEffect(() => {
    const rec = loadIntakeRecord();
    if (!rec || !rec.transcript) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLang(rec.handoff.detected_lang);
    speech.setFinalText(rec.transcript);
    setUserCorrected(false);
    setCorrectOpen(true);
    setStage("record");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The handoff is the agent's "next step" trigger: seed the transcript and
  // advance straight into GATE 1 (Notes, step 3) without a manual click.
  // If the gate fails, fall back to the record stage with everything prefilled.
  useEffect(() => {
    if (!live.handoff) return;
    const h = live.handoff;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLang(h.detected_lang);
    const text = composeIntakeTranscript(h, live.userText);
    if (!text) {
      setStage("record");
      return;
    }
    speech.setFinalText(text);
    setUserCorrected(false);
    setCorrectOpen(true);
    setErr(null);
    setTranscript(text);
    setAdvancing(true);
    void (async () => {
      const ok = await runNotes(text, h);
      setAdvancing(false);
      if (!ok) setStage("record");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.handoff]);

  function continueFromLive() {
    const text = live.userText.trim().slice(0, 6000);
    if (!text) return;
    speech.setFinalText(text);
    setUserCorrected(false);
    setCorrectOpen(true);
    setErr(null);
    setStage("record");
  }

  const micMode = liveReady ? "Live intake" : speech.supported ? "Web Speech" : "Text only";
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
    live.stop();
    clearIntakeRecord();
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

  async function runNotes(text: string, intakeHints?: IntakeHandoff): Promise<boolean> {
    setBusy("notes");
    setErr(null);
    try {
      const intake: IntakeHints | undefined = intakeHints
        ? {
            summary: intakeHints.summary,
            place: intakeHints.place,
            date_range: intakeHints.date_range,
            authority_hint: intakeHints.authority_hint,
          }
        : undefined;
      const r = await postJSON<NotesResp>("/api/agent/notes", { transcript: text, lang, intake });
      recordMode("notes", r.mode);
      setNotes(r.data);
      setCandidates([]);
      setRetrieved([]);
      setStage("notes");
      return true;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not reach the agent.");
      return false;
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
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Drafting failed.");
    } finally {
      setBusy(null);
    }
  }

  function editDraft(next: Draft) {
    setDraft(next);
    setCandidates([]);
    setRetrieved([]);
    setPicked(null);
    setReviewRequired(false);
    setApplicationPdf(null);
    setSavedApplication(null);
    setStorageMessage(null);
  }

  function editNotes(next: Notes) {
    setNotes(next);
    setGuard(null);
    setDraft(null);
    setCandidates([]);
    setRetrieved([]);
    setPicked(null);
    setApplicationPdf(null);
    setSavedApplication(null);
    setStorageMessage(null);
  }

  function selectAuthority(id: string) {
    setPicked(id);
    setApplicationPdf(null);
    setSavedApplication(null);
    setStorageMessage(null);
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
  const draftValid = Boolean(
    draft
    && draft.title.trim().length > 0
    && draft.requests.length >= 3
    && draft.requests.every((request) => request.trim().length >= 20),
  );

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

  function openPreview() {
    if (!picked || !draft || !notes) {
      setErr("Complete the application and authority selection before opening the PDF preview.");
      return;
    }
    setSavedApplication(null);
    setStorageMessage(null);
    setApplicationPdf(createApplicationPdf({ report, applicant }));
    setErr(null);
    setStage("pay");
  }

  async function generateAcknowledgement() {
    if (!applicationPdf || !picked || !draft) return;
    if (savedApplication) {
      setStage("receipt");
      return;
    }
    setSavingApplication(true);
    setErr(null);
    try {
      const acknowledgementNumber = makeAcknowledgementNumber();
      const createdAt = new Date().toISOString();
      const seed: Omit<StoredApplication, "applicationPdfBase64" | "receiptPdfBase64"> = {
        acknowledgementNumber,
        reference,
        createdAt,
        status: "PRAJA_ACKNOWLEDGED",
        governmentSubmissionStatus: "NOT_SUBMITTED",
        applicant: { ...applicant, email: applicant.email.trim().toLowerCase() },
        report,
      };
      const finalApplicationPdf = createApplicationPdf({ report, applicant: seed.applicant, acknowledgementNumber });
      const receiptPdf = createReceiptPdf(seed);
      const record: StoredApplication = {
        ...seed,
        applicationPdfBase64: await blobToBase64(finalApplicationPdf),
        receiptPdfBase64: await blobToBase64(receiptPdf),
      };
      const storage = await saveApplication(record);
      setApplicationPdf(finalApplicationPdf);
      setSavedApplication(record);
      setStorageMessage(
        storage === "server-and-device"
          ? "Stored in the application database and on this device."
          : "Stored in this browser. The server database was unavailable in this static or offline session.",
      );
      setPressed(true);
      window.setTimeout(() => setPressed(false), 500);
      setStage("receipt");
    } catch {
      setErr("The acknowledgement could not be stored. Your application is still intact; try again.");
    } finally {
      setSavingApplication(false);
    }
  }

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
        notice={liveReady
          ? "During a live voice session your voice is processed in real time by Google's Live API. Only the text you review and confirm is analysed; audio is not stored by this site."
          : "Only edited transcript text is analysed. Audio is not sent."}
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
        <span className={`inline-flex items-center rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] ${liveReady || speech.supported ? "border-[var(--iris)]/25 bg-[var(--iris-tint)] text-[var(--iris)]" : "border-[var(--line-strong)] text-[var(--fg-faint)]"}`}>
          Voice: {micMode}
        </span>
        <span className={`inline-flex items-center rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] ${liveModel ? "border-[var(--green)]/30 bg-[var(--green)]/10 text-[var(--green)]" : "border-[var(--amber)]/30 bg-[var(--amber)]/10 text-[var(--amber)]"}`}>
          Processing: {liveModel ? "Live service" : anySimulated ? "Local fallback" : "Ready"}
        </span>
        <span
          className="inline-flex items-center rounded-md border border-[var(--line)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--fg-faint)]"
          title={DIRECTORY_RECONCILIATION}
        >
          Directory: {DIRECTORY.length.toLocaleString("en-IN")} unique · portal heading {PORTAL_TOTAL.toLocaleString("en-IN")} · {DIRECTORY_SNAPSHOT}
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
              className={`tab ${active ? "tab-active" : done ? "opacity-90 cursor-pointer hover:border-[var(--iris)]/50 hover:text-[var(--fg)]" : "opacity-55"}`}
              aria-current={active ? "step" : undefined}
              onClick={done ? () => { setErr(null); setStage(s); } : undefined}
              role={done ? "button" : undefined}
              tabIndex={done ? 0 : undefined}
              onKeyDown={done ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setErr(null); setStage(s); } } : undefined}
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
              {/* ---------- ADVANCING (agent handoff → GATE 1) ---------- */}
              {advancing && (
                <div>
                  <h1 className="font-display text-[28px] md:text-[32px] font-medium leading-[1.1] tracking-tight mb-3">
                    The agent captured your complaint.
                  </h1>
                  <p className="text-[15px] text-[var(--fg-soft)] leading-relaxed mb-6 max-w-[58ch]">
                    Handing it to step 3 — period, place, records, likely authority, and format are being separated for review.
                  </p>
                  <div className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--glass-faint)] px-5 py-4">
                    <span className="inline-block size-2.5 rounded-full bg-[var(--iris)] animate-pulse" aria-hidden />
                    <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-soft)]">
                       Structuring the request intent…
                    </span>
                  </div>
                </div>
              )}

              {/* ---------- SETUP ---------- */}
              {stage === "setup" && !advancing && (
                <div>
                  <h1 className="font-display text-[28px] md:text-[32px] font-medium leading-[1.1] tracking-tight mb-3">
                    Speak in your language. The console takes notes.
                  </h1>
                  <p className="text-[15px] text-[var(--fg-soft)] leading-relaxed mb-7 max-w-[58ch]">
                    Tap the assistant and just talk — a complaint, a rant, or half a thought. It learns your
                    language by ear, and you will see every word before anything is analysed. Prefer to pick
                    a language yourself? Use the picker below.
                  </p>

                  {liveReady && (
                    <div className="mb-6 rounded-xl border border-[var(--line-strong)] bg-[var(--glass-faint)] px-5 py-5">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-faint)]">
                          Live voice intake
                        </div>
                        <span className="inline-flex items-center rounded-md border border-[var(--iris)]/25 bg-[var(--iris-tint)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--iris)]">
                          Gemini 3 Flash Live
                        </span>
                      </div>

                      {live.status === "idle" || live.status === "failed" || live.status === "ended" || live.status === "done" ? (
                        <>
                          <p className="text-[14px] text-[var(--fg-soft)] leading-relaxed mb-4 max-w-[56ch]">
                            One conversation. The assistant works out your language by ear, may ask up to
                            three short questions, and you can interrupt it anytime. Nothing is analysed
                            until you review the words and send them.
                          </p>
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={live.start}
                              className="brass-plate px-6 py-3 font-mono text-[12px] uppercase tracking-[0.08em] transition-all"
                            >
                              Talk to the assistant
                            </button>
                            {live.status === "ended" && live.userText.trim() && (
                              <button
                                type="button"
                                onClick={continueFromLive}
                                className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-faint)] hover:text-[var(--fg-soft)]"
                              >
                                Review what I said →
                              </button>
                            )}
                            {live.error && (
                              <span className="text-[13px] text-[var(--amber)]">{live.error}</span>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-center gap-3 mb-3">
                            <span className="inline-block size-2.5 rounded-full bg-[var(--green)] animate-pulse" aria-hidden />
                            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-soft)]">
                              {live.status === "connecting" ? "Connecting…" : live.status === "wrapup" ? "Wrapping up…" : "Listening — speak naturally, interrupt anytime"}
                            </span>
                            <button
                              type="button"
                              onClick={live.stop}
                              className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-faint)] hover:text-[var(--fg-soft)]"
                            >
                              Stop
                            </button>
                          </div>
                          <div className="rounded-xl border border-[var(--line)] bg-[var(--glass-strong)] px-4 py-3 min-h-[96px]" aria-live="polite">
                            {live.agentText ? (
                              <p className="text-[13.5px] leading-[1.65] text-[var(--iris)] mb-2">Assistant: {live.agentText}</p>
                            ) : null}
                            {live.userText ? (
                              <p className="text-[13.5px] leading-[1.65] text-[var(--fg)]">You: {live.userText}</p>
                            ) : (
                              <p className="text-[13.5px] italic text-[var(--fg-faint)]">Your words will appear here…</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <details className="mb-6" open={!liveReady}>
                    <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-faint)] hover:text-[var(--fg-soft)] select-none">
                      {liveReady ? "Pick my language instead" : "I will speak in"}
                    </summary>
                    <div className="mt-3">
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
                  </details>

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

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={finishRecording}
                      disabled={busy === "notes"}
                      className={`brass-plate px-6 py-3 font-mono text-[12px] uppercase tracking-[0.18em] transition-all ${busy === "notes" ? "opacity-60" : ""}`}
                    >
                      {busy === "notes" ? "Reading your words…" : "Send to the agent →"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setErr(null);
                        setStage("setup");
                      }}
                      className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-faint)] hover:text-[var(--fg-soft)] transition-colors"
                    >
                      ← Back
                    </button>
                  </div>
                </div>
              )}

              {/* ---------- NOTES ---------- */}
              {stage === "notes" && notes && (
                <div>
                  <h1 className="font-display text-[28px] md:text-[32px] font-medium leading-[1.1] tracking-tight mb-2">
                    Your request intent, separated for review.
                  </h1>
                  <p className="text-[14px] text-[var(--fg-soft)] mb-6">
                    Step 2 has been handed off. Check the period, place or project, likely records holder,
                    and format before the exemption guard runs.
                  </p>

                  <div className="rounded-xl border border-[var(--line)] overflow-hidden mb-6">
                    <div className="bg-[var(--glass-faint)] px-4 py-3 border-b border-[var(--line)]">
                      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-faint)] mb-2">Records sought</div>
                      <div className="space-y-2">
                        {notes.records_sought.map((record, index) => (
                          <textarea
                            key={`${index}-${record.slice(0, 16)}`}
                            value={record}
                            rows={2}
                            aria-label={`Record request ${index + 1}`}
                            onChange={(event) => editNotes({
                              ...notes,
                              records_sought: notes.records_sought.map((item, itemIndex) => itemIndex === index ? event.target.value : item),
                            })}
                            className="w-full rounded-lg border border-[var(--line-strong)] bg-[var(--glass-strong)] px-3 py-2 text-[14px] leading-relaxed outline-none focus:border-[var(--iris)] focus:ring-4 focus:ring-[var(--iris)]/10 resize-y"
                          />
                        ))}
                      </div>
                    </div>
                    <IntentField label="Period" value={notes.date_range ?? ""} placeholder="Not stated" onChange={(value) => editNotes({ ...notes, date_range: value || null })} />
                    <IntentField label="Place / project" value={notes.place ?? ""} placeholder="Not stated" onChange={(value) => editNotes({ ...notes, place: value || null })} />
                    <IntentField label="Likely authority" value={notes.body_hint ?? ""} placeholder="To be matched in step 6" onChange={(value) => editNotes({ ...notes, body_hint: value || null })} />
                    <label className="grid sm:grid-cols-[150px_1fr] gap-2 sm:gap-4 px-4 py-3 border-t border-[var(--line)] items-center">
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-faint)]">Format</span>
                      <select
                        value={notes.format}
                        onChange={(event) => editNotes({ ...notes, format: event.target.value as Notes["format"] })}
                        className="rounded-lg border border-[var(--line-strong)] bg-[var(--glass-strong)] px-3 py-2 text-[16px] outline-none focus:border-[var(--iris)] focus:ring-4 focus:ring-[var(--iris)]/10"
                      >
                        <option value="certified copies">Certified copies</option>
                        <option value="electronic copies">Electronic copies</option>
                        <option value="inspection">Inspection</option>
                        <option value="samples">Samples</option>
                      </select>
                    </label>
                  </div>

                  {err && <p className="mb-4 text-[13.5px] text-[var(--red)]">{err}</p>}

                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={confirmNotes} disabled={busy === "guard"} className={`brass-plate px-5 py-2.5 font-mono text-[12px] uppercase tracking-[0.16em] ${busy === "guard" ? "opacity-60" : ""}`}>
                      {busy === "guard" ? "Checking exemptions..." : "Looks right. Check exemptions →"}
                    </button>
                    <button type="button" onClick={() => { setErr(null); setStage("record"); }} className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-faint)] hover:text-[var(--fg-soft)] transition-colors">
                      ← Back
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
                      <div className="flex flex-wrap items-center gap-3">
                        <button type="button" onClick={proceedToDraft} disabled={busy === "draft"} className={`brass-plate px-5 py-2.5 font-mono text-[12px] uppercase tracking-[0.16em] ${busy === "draft" ? "opacity-60" : ""}`}>
                          {busy === "draft" ? "Drafting…" : "Draft the application →"}
                        </button>
                        <button type="button" onClick={() => { setErr(null); setStage("notes"); }} className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-faint)] hover:text-[var(--fg-soft)] transition-colors">
                          ← Back
                        </button>
                      </div>
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
                        <button type="button" onClick={() => { setErr(null); setStage("notes"); }} className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-faint)] hover:text-[var(--fg-soft)] transition-colors">
                          ← Back
                        </button>
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

                  <label className="block mb-4">
                    <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-faint)] mb-2">Application title</span>
                    <input
                      value={draft.title}
                      maxLength={160}
                      onChange={(event) => editDraft({ ...draft, title: event.target.value })}
                      className="w-full rounded-lg border border-[var(--line-strong)] bg-[var(--glass-strong)] px-4 py-2.5 text-[16px] font-medium outline-none focus:border-[var(--iris)] focus:ring-4 focus:ring-[var(--iris)]/10"
                    />
                  </label>

                  <div className="space-y-3 mb-4">
                    {draft.requests.map((r, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <span className="font-display text-[var(--fg-faint)] pt-0.5">{i + 1}.</span>
                        <textarea
                          value={r}
                          rows={2}
                          onChange={(e) => {
                            const next = { ...draft, requests: draft.requests.map((x, j) => (j === i ? e.target.value : x)) };
                            editDraft(next);
                          }}
                          className="flex-1 rounded-xl border border-[var(--line)] bg-[var(--glass)] px-4 py-2.5 text-[14.5px] leading-relaxed outline-none focus:border-[var(--iris)] focus:ring-4 focus:ring-[var(--iris)]/10 resize-y"
                        />
                        {draft.requests.length > 3 && (
                          <button
                            type="button"
                            aria-label={`Remove request ${i + 1}`}
                            onClick={() => editDraft({ ...draft, requests: draft.requests.filter((_, itemIndex) => itemIndex !== i) })}
                            className="min-h-11 px-2 text-[12px] text-[var(--red)] underline underline-offset-4"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {draft.requests.length < 5 && (
                    <button
                      type="button"
                      onClick={() => editDraft({ ...draft, requests: [...draft.requests, "Please provide certified copies of the relevant official record."] })}
                      className="mb-4 min-h-11 text-[12px] font-medium text-[var(--iris)] underline underline-offset-4"
                    >
                      Add another record request
                    </button>
                  )}

                  <div className="flex items-center justify-between mb-6">
                    <span className="font-mono text-[11px] text-[var(--fg-faint)]">
                      {draftCharCount} / 3,000 characters {draftCharCount > 3000 && <span className="text-[var(--red)]">· over the limit, trim or attach a PDF</span>}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={explainRoute}
                      disabled={busy === "explain" || draftCharCount > 3000 || !draftValid}
                      className={`brass-plate px-5 py-2.5 font-mono text-[12px] uppercase tracking-[0.16em] ${busy === "explain" || draftCharCount > 3000 || !draftValid ? "opacity-60" : ""}`}
                    >
                      {busy === "explain" ? "Finding the right authority…" : "Match the likely authority →"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setErr(null);
                        setStage(guard ? "guard" : "notes");
                      }}
                      className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-faint)] hover:text-[var(--fg-soft)] transition-colors"
                    >
                      ← Back
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
                    {candidates.length > 0 ? "Three likely records holders." : "No confident authority match yet."}
                  </h1>
                  <p className="text-[14px] text-[var(--fg-soft)] mb-6">
                    The matcher combines a dated Central RTI Online snapshot with explicit jurisdiction rules
                    for named State projects. The snapshot contains {DIRECTORY.length.toLocaleString("en-IN")} unique identifiers;
                    the official page heading claims {PORTAL_TOTAL.toLocaleString("en-IN")}. You still choose.
                  </p>

                  <details className="mb-6 rounded-lg border border-[var(--line)] bg-[var(--glass-faint)] px-4 py-3 text-[13px] text-[var(--fg-soft)]">
                    <summary className="cursor-pointer font-medium text-[var(--fg)]">Why the two directory counts differ</summary>
                    <p className="mt-2 leading-relaxed">{DIRECTORY_RECONCILIATION}</p>
                  </details>

                  {notes?.is_state_matter && (
                    <div className="rounded-xl border border-[var(--amber)]/30 bg-[var(--amber)]/[0.06] px-5 py-4 mb-6">
                      <p className="text-[14px] text-[var(--fg-soft)]">
                        This looks like a State or local-body matter{notes.state_name ? ` (${notes.state_name})` : ""}.
                        A State jurisdiction rule may therefore appear above the Central directory matches. You can
                        still finish the application preview and save it in this Praja workspace.
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
                      const meta = retrieved.find((item) => item.id === c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => selectAuthority(c.id)}
                          className={`w-full text-left rounded-xl border px-5 py-4 transition-all duration-150 ${active ? "border-[var(--iris)] bg-[var(--iris-tint)] ring-4 ring-[var(--iris)]/10" : "border-[var(--line)] bg-[var(--glass)] hover:border-[var(--iris)]/40"}`}
                        >
                          <div className="flex items-baseline justify-between gap-3 mb-1">
                            <span className="font-display text-[16px] font-medium text-[var(--fg)]">{nameOf(c.id)}</span>
                            <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[var(--fg-faint)] shrink-0">
                              {i === 0 ? "Best match" : i === 1 ? "Alternative 2" : "Alternative 3"}
                            </span>
                          </div>
                          <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[var(--fg-faint)] mb-2">
                            {ministryOf(c.id)}
                          </div>
                          <p className="text-[13.5px] leading-relaxed text-[var(--fg-soft)]">{c.why}</p>
                          <p className="text-[12.5px] italic leading-relaxed text-[var(--fg-faint)] mt-1">{c.caveat}</p>
                          <div className="mt-3 flex flex-wrap gap-2 font-mono text-[9.5px] uppercase tracking-[0.12em] text-[var(--fg-faint)]">
                            <span className="rounded-md border border-[var(--line-strong)] px-2 py-1">
                              {meta?.directory_status === "curated-jurisdiction-rule" ? "Jurisdiction rule" : "Central directory snapshot"}
                            </span>
                            <span className="rounded-md border border-[var(--line-strong)] px-2 py-1">
                              {meta?.filing_channel ?? "RTI Online Central portal"}
                            </span>
                          </div>
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
                              selectAuthority(p.pa_code);
                              if (!retrieved.find((r) => r.id === p.pa_code)) {
                                setRetrieved((prev) => [...prev, {
                                  id: p.pa_code,
                                  name: p.name,
                                  ministry: p.ministry,
                                  matched: [],
                                  score: 1,
                                  jurisdiction: p.jurisdiction ?? "central",
                                  directory_status: p.directory_status ?? "official-central-snapshot",
                                  filing_channel: p.filing_channel ?? "RTI Online Central portal",
                                }]);
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
                    <button
                      type="button"
                      onClick={() => {
                        setErr(null);
                        setStage("draft");
                      }}
                      className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-faint)] hover:text-[var(--fg-soft)] transition-colors"
                    >
                      ← Back
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
                    Verify the applicant details.
                  </h1>
                  <p className="text-[14px] text-[var(--fg-soft)] mb-6">
                    The official form requires applicant details before payment and submission. This Praja workspace
                    uses the visible verification code <span className="font-mono font-semibold text-[var(--fg)]">123456</span> and does not send SMS.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <label className="block">
                      <span className="block text-[12px] font-medium text-[var(--fg-soft)] mb-1.5">Full name *</span>
                      <input
                        value={applicant.name}
                        onChange={(event) => setApplicant({ ...applicant, name: event.target.value })}
                        autoComplete="name"
                        className="w-full rounded-lg border border-[var(--line-strong)] bg-[var(--glass-strong)] px-4 py-2.5 text-[16px] outline-none focus:border-[var(--iris)] focus:ring-4 focus:ring-[var(--iris)]/10"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-[12px] font-medium text-[var(--fg-soft)] mb-1.5">Email *</span>
                      <input
                        type="email"
                        value={applicant.email}
                        onChange={(event) => setApplicant({ ...applicant, email: event.target.value })}
                        autoComplete="email"
                        className="w-full rounded-lg border border-[var(--line-strong)] bg-[var(--glass-strong)] px-4 py-2.5 text-[16px] outline-none focus:border-[var(--iris)] focus:ring-4 focus:ring-[var(--iris)]/10"
                      />
                    </label>
                  </div>
                  <label className="block mb-4">
                    <span className="block text-[12px] font-medium text-[var(--fg-soft)] mb-1.5">Postal address *</span>
                    <textarea
                      value={applicant.address}
                      onChange={(event) => setApplicant({ ...applicant, address: event.target.value })}
                      autoComplete="street-address"
                      rows={3}
                      className="w-full rounded-lg border border-[var(--line-strong)] bg-[var(--glass-strong)] px-4 py-2.5 text-[16px] leading-relaxed outline-none focus:border-[var(--iris)] focus:ring-4 focus:ring-[var(--iris)]/10 resize-y"
                    />
                  </label>
                  <div className="grid sm:grid-cols-2 gap-4 mb-5">
                    <label className="block">
                      <span className="block text-[12px] font-medium text-[var(--fg-soft)] mb-1.5">Mobile number (optional)</span>
                      <input
                        value={applicant.mobile}
                        onChange={(event) => setApplicant({ ...applicant, mobile: event.target.value.replace(/[^0-9+ -]/g, "").slice(0, 20) })}
                        inputMode="tel"
                        autoComplete="tel"
                        className="w-full rounded-lg border border-[var(--line-strong)] bg-[var(--glass-strong)] px-4 py-2.5 text-[16px] outline-none focus:border-[var(--iris)] focus:ring-4 focus:ring-[var(--iris)]/10"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-[12px] font-medium text-[var(--fg-soft)] mb-1.5">Local verification code *</span>
                      <input
                        value={otp}
                        onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                        inputMode="numeric"
                        placeholder="123456"
                        autoComplete="one-time-code"
                        className="w-full rounded-lg border border-[var(--line-strong)] bg-[var(--glass-strong)] px-4 py-2.5 text-[16px] tracking-[0.2em] outline-none focus:border-[var(--iris)] focus:ring-4 focus:ring-[var(--iris)]/10"
                      />
                    </label>
                  </div>
                  <label className="flex items-start gap-3 rounded-lg border border-[var(--line)] bg-[var(--glass-faint)] px-4 py-3 mb-5 text-[13.5px] text-[var(--fg-soft)]">
                    <input
                      type="checkbox"
                      checked={applicant.isBpl}
                      onChange={(event) => setApplicant({ ...applicant, isBpl: event.target.checked })}
                      className="mt-0.5 size-5 accent-[var(--iris)]"
                    />
                    <span>I am below the poverty line. The official portal would require a supporting BPL certificate and charge no application fee.</span>
                  </label>
                  {err && <p className="mb-4 text-[13.5px] text-[var(--red)]">{err}</p>}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (applicant.name.trim().length < 2) {
                          setErr("Enter the applicant's full name.");
                        } else if (!/^\S+@\S+\.\S+$/.test(applicant.email.trim())) {
                          setErr("Enter a valid email address.");
                        } else if (applicant.address.trim().length < 5) {
                          setErr("Enter the postal address that should appear on the application.");
                        } else if (otp !== "123456") {
                          setErr("Wrong code. Use the local verification code 123456.");
                        } else {
                          openPreview();
                        }
                      }}
                      disabled={otp.length !== 6}
                      className={`brass-plate px-5 py-2.5 font-mono text-[12px] uppercase tracking-[0.16em] ${otp.length !== 6 ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      Verify and build PDF →
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
                    Preview the application as a PDF.
                  </h1>
                  <p className="text-[14px] text-[var(--fg-soft)] mb-6">
                    This mirrors the information hierarchy of a real RTI form: applicant, authority, subject,
                    numbered requests, period, place, format, and fee status. Review it before creating the Praja acknowledgement.
                  </p>

                  <div className="grid sm:grid-cols-3 border-y border-[var(--line)] mb-5 text-[13px]">
                    <div className="py-3 sm:pr-3"><span className="block text-[10px] uppercase tracking-[0.12em] text-[var(--fg-faint)]">Authority</span>{picked ? nameOf(picked) : "Not selected"}</div>
                    <div className="py-3 sm:px-3 sm:border-l border-[var(--line)]"><span className="block text-[10px] uppercase tracking-[0.12em] text-[var(--fg-faint)]">Application text</span>{draftCharCount.toLocaleString("en-IN")} / 3,000 characters</div>
                    <div className="py-3 sm:pl-3 sm:border-l border-[var(--line)]"><span className="block text-[10px] uppercase tracking-[0.12em] text-[var(--fg-faint)]">Fee preview</span>{applicant.isBpl ? "Rs 0 (BPL)" : "Rs 10; no payment processed"}</div>
                  </div>

                  {applicationPdfUrl ? (
                    <object className="application-pdf-object mb-5" data={applicationPdfUrl} type="application/pdf" aria-label="RTI application PDF preview">
                      <p>Your browser cannot show this PDF preview. Download it using the button below.</p>
                    </object>
                  ) : (
                    <div className="rounded-lg border border-[var(--line)] bg-[var(--glass-faint)] px-5 py-8 mb-5 text-[14px] text-[var(--fg-soft)]">Building the PDF preview...</div>
                  )}

                  <p className="rounded-lg border border-[var(--truth-line)] bg-[var(--truth-bg)] px-4 py-3 mb-5 text-[13px] leading-relaxed text-[var(--truth-fg)]">
                    The official portal accepts up to 3,000 characters in its text field, supports a PDF attachment for longer applications, and issues its own registration number only after the payment/submission flow. This preview does none of those Government actions.
                  </p>

                  {err && <p className="mb-4 text-[13.5px] text-[var(--red)]">{err}</p>}

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void generateAcknowledgement()}
                      disabled={!applicationPdf || savingApplication}
                      className={`brass-plate px-6 py-3 font-mono text-[12px] uppercase tracking-[0.18em] transition-all ${pressed ? "stamp-press" : ""}`}
                    >
                      {savingApplication ? "Saving application..." : "Confirm and create acknowledgement"}
                    </button>
                    {applicationPdf && (
                      <button type="button" onClick={() => downloadBlob("praja-rti-application-preview.pdf", applicationPdf)} className="min-h-11 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--iris)] underline underline-offset-4">
                        Download preview PDF
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setErr(null);
                        setStage("otp");
                      }}
                      className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-faint)] hover:text-[var(--fg-soft)] transition-colors"
                    >
                      ← Back
                    </button>
                  </div>
                </div>
              )}

              {/* ---------- RECEIPT ---------- */}
              {stage === "receipt" && savedApplication && (
                <div>
                  <h1 className="font-display text-[28px] md:text-[32px] font-medium leading-[1.1] tracking-tight mb-2">
                    Your Praja acknowledgement is ready.
                  </h1>
                  <p className="text-[14px] text-[var(--fg-soft)] mb-6">
                    Keep this number to reopen the application and both PDFs from the home page. It is a Praja
                    record number, not a Government RTI registration number.
                  </p>

                  <div className="rounded-xl border border-[var(--line)] bg-[var(--glass-strong)] px-6 py-6 mb-6 relative">
                    <div className="absolute -top-3.5 right-5 rounded-md border border-[var(--green)]/30 bg-[var(--green-soft)] px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--green)]">
                      Copy stored
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-faint)] mb-2">
                      Praja RTI | local acknowledgement
                    </div>
                    <div className="font-display text-[20px] font-medium mb-1 break-all">{savedApplication.acknowledgementNumber}</div>
                    <div className="text-[12px] text-[var(--fg-faint)] mb-4">{storageMessage}</div>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13.5px]">
                      <div>
                        <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-faint)] mb-0.5">Authority</dt>
                        <dd className="text-[var(--fg)]">{picked ? nameOf(picked) : "Not available"}</dd>
                      </div>
                      <div>
                        <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-faint)] mb-0.5">Workspace</dt>
                        <dd className="text-[var(--fg)]">{applicant.isBpl ? "Rs 0 BPL fee preview" : "Rs 10 fee preview; no payment processed"}</dd>
                      </div>
                      <div>
                        <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-faint)] mb-0.5">Requests</dt>
                        <dd className="text-[var(--fg)]">{draft?.requests.length ?? "Not available"}</dd>
                      </div>
                      <div>
                        <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-faint)] mb-0.5">Government status</dt>
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
                    <button type="button" onClick={() => downloadPdfBase64("praja-rti-application.pdf", savedApplication.applicationPdfBase64)} className="brass-plate px-5 py-2.5 font-mono text-[12px] uppercase tracking-[0.16em]">
                      Download application PDF
                    </button>
                    <button type="button" onClick={() => downloadPdfBase64("praja-rti-acknowledgement.pdf", savedApplication.receiptPdfBase64)} className="brass-plate px-5 py-2.5 font-mono text-[12px] uppercase tracking-[0.16em]">
                      Download receipt PDF
                    </button>
                    <button type="button" onClick={() => navigator.clipboard.writeText(savedApplication.acknowledgementNumber)} className="min-h-11 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-faint)] hover:text-[var(--fg-soft)]">
                      Copy acknowledgement number
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setErr(null);
                        setStage("pay");
                      }}
                      className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-faint)] hover:text-[var(--fg-soft)] transition-colors"
                    >
                      ← Back
                    </button>
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
                        setOtp("");
                        setApplicant({ name: "", email: "", address: "", mobile: "", citizenship: "Indian", isBpl: false });
                        setApplicationPdf(null);
                        setSavedApplication(null);
                        setStorageMessage(null);
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
                Your speech is recognised in the browser. The confirmed transcript passes through four
                locked JSON jobs: intent extraction, exemption guard, application drafting, and authority
                explanation. Jurisdiction rules sit beside the dated Central directory so a named State
                project is not forced into the wrong Central department.
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

function IntentField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid sm:grid-cols-[150px_1fr] gap-2 sm:gap-4 px-4 py-3 border-t border-[var(--line)] items-center">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-faint)]">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-[var(--line-strong)] bg-[var(--glass-strong)] px-3 py-2 text-[16px] outline-none focus:border-[var(--iris)] focus:ring-4 focus:ring-[var(--iris)]/10"
      />
    </label>
  );
}

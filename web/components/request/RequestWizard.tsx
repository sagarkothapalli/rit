"use client";

/* ============================================================
   The drafting workspace.

   Nine steps, named the way the RTI process itself is named, not
   the way the code is structured. The citizen confirms every
   consequential move; the model never advances a step on its own
   past the intake handoff.
   ============================================================ */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SiteMasthead from "@/components/SiteMasthead";
import Advancing from "@/components/request/Advancing";
import AcknowledgementStep from "@/components/request/AcknowledgementStep";
import ApplicantStep from "@/components/request/ApplicantStep";
import ApplicationStep from "@/components/request/ApplicationStep";
import AuthorityStep from "@/components/request/AuthorityStep";
import DescribeStep from "@/components/request/DescribeStep";
import EligibilityStep from "@/components/request/EligibilityStep";
import LanguageStep from "@/components/request/LanguageStep";
import ProgressCard from "@/components/request/ProgressCard";
import RecordsStep from "@/components/request/RecordsStep";
import ReviewStep from "@/components/request/ReviewStep";
import StepBar from "@/components/request/StepBar";
import { STEP_IDS, type Step } from "@/components/request/steps";
import { useSpeech } from "@/hooks/useSpeech";
import { useLiveIntake } from "@/hooks/useLiveIntake";
import { searchDirectory, type PublicAuthority } from "@/lib/retrieval";
import {
  draftFallback,
  explainFallback,
  guardFallback,
  notesFallback,
  bplVerificationFallback,
  type Notes,
  type Guard,
  type Draft,
  type IntakeHints,
} from "@/lib/cage/schemas";
import { clearIntakeRecord, composeIntakeTranscript, loadIntakeRecord } from "@/lib/live/intakeMemory";
import { hasApplicantData, type IntakeHandoff } from "@/lib/live/intakePrompt";
import { normalizeNotes, routingQuery } from "@/lib/intake";
import { hostedGate } from "@/lib/cage/hosted";
import {
  applicationLength,
  applicationText,
  buildReport,
  disallowedCharacters,
  downloadText,
  formatReportText,
  reportFilename,
} from "@/lib/report";
import {
  blobToBase64,
  downloadBlob,
  makeAcknowledgementNumber,
  saveApplication,
  type StoredApplication,
} from "@/lib/application-records";
import { emptyApplicant, lookupPincode, validateApplicant, type ApplicantDetails, type FieldProblem } from "@/lib/applicant";
import { createApplicationPdf, createReceiptPdf } from "@/lib/application-pdf";
import ExternalFilingHandoff from "@/components/cases/ExternalFilingHandoff";
import { coveringStatement } from "@/lib/filing-rules/portal-text";
import { filingRulesFor } from "@/lib/filing-rules/registry";
import { validateApplicantAgainstRules } from "@/lib/filing-rules/validate";
import { jurisdictionFromNotes } from "@/lib/domain/status";
import { saveCase } from "@/lib/storage/cases.client";
import { createBlankCase } from "@/lib/storage/factory";
import { hashAccessToken } from "@/lib/storage/id";
import { putAttachmentBlob } from "@/lib/storage/cases.client";
import { createFullRequestPdf } from "@/lib/packets/request";
import { attachmentMeta } from "@/lib/packets";
import { blobToBytes } from "@/lib/packets/zip";
import type { CaseRecord } from "@/lib/domain/case";

/* ---------- the nine steps ---------- */

/* ---------- transport ---------- */

type Mode = "LIVE" | "SIMULATED";

function spokenTranscript(finalText: string, interimText: string) {
  return [finalText, interimText].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function localFallback(url: string, body: unknown): unknown {
  if (url.endsWith("/notes")) {
    const request = body as { transcript?: string; intake?: IntakeHints };
    const transcript = request.transcript ?? "";
    return {
      mode: "SIMULATED",
      data: normalizeNotes(transcript, notesFallback(transcript), request.intake),
    };
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
    const { results, reviewRequired } = searchDirectory(query, 3);
    const retrieved = results.map((result) => ({
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
      review_required: reviewRequired || retrieved.length === 0,
      retrieved,
    };
  }
  if (url.endsWith("/verify-bpl")) {
    const request = body as { fileName?: string; fileType?: string; fileSize?: number; fileBase64?: string };
    return {
      mode: "SIMULATED",
      data: bplVerificationFallback(request.fileName ?? "document"),
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
      // Fall through to the hosted proxy, then to local fallbacks.
    }
  }
  try {
    return (await hostedGate(url, body)) as T;
  } catch {
    // Proxy or model unavailable — same deterministic path as no-key mode.
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
}

/* ---------- page ---------- */

export default function RequestWorkspace() {
  const [step, setStep] = useState<Step>("language");
  const [lang, setLang] = useState("en-IN");
  const [intakeMode, setIntakeMode] = useState<"assistant" | "manual" | null>(null);

  const [manualText, setManualText] = useState("");
  const [userCorrected, setUserCorrected] = useState(false);
  const [transcript, setTranscript] = useState("");

  const [notes, setNotes] = useState<Notes | null>(null);
  const [guard, setGuard] = useState<Guard | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const [candidates, setCandidates] = useState<ExplainCandidate[]>([]);
  const [retrieved, setRetrieved] = useState<RetrievedPA[]>([]);
  const [reviewRequired, setReviewRequired] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [manualAuthority, setManualAuthority] = useState<PublicAuthority | null>(null);
  const [browsingDirectory, setBrowsingDirectory] = useState(false);

  const [applicant, setApplicant] = useState<ApplicantDetails>(emptyApplicant);
  const [prefilled, setPrefilled] = useState<Set<keyof ApplicantDetails>>(new Set());
  const [problems, setProblems] = useState<FieldProblem[]>([]);
  const [emailVerified, setEmailVerified] = useState(false);

  const [reference] = useState(() => `PRTI 2026 ${Math.floor(100000 + Math.random() * 899999)}`);
  const [applicationPdf, setApplicationPdf] = useState<Blob | null>(null);
  const [savedApplication, setSavedApplication] = useState<StoredApplication | null>(null);
  const [savedCase, setSavedCase] = useState<CaseRecord | null>(null);
  const [storageMessage, setStorageMessage] = useState<string | null>(null);
  const [savingApplication, setSavingApplication] = useState(false);
  const [useTextAttachment, setUseTextAttachment] = useState(false);

  const [busy, setBusy] = useState<null | "notes" | "guard" | "draft" | "explain">(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  const speech = useSpeech(lang);
  const live = useLiveIntake();
  const [liveReady, setLiveReady] = useState(false);

  const applicationPdfUrl = useMemo(
    () => (applicationPdf ? URL.createObjectURL(applicationPdf) : null),
    [applicationPdf],
  );

  useEffect(() => {
    return () => {
      if (applicationPdfUrl) URL.revokeObjectURL(applicationPdfUrl);
    };
  }, [applicationPdfUrl]);

  useEffect(() => {
    // Static hosted deploys have no token route — the manual path covers them.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLiveReady(live.supported && !onStaticHost());
  }, [live.supported]);

  // Restore an intake captured before a refresh.
  useEffect(() => {
    const record = loadIntakeRecord();
    if (!record?.transcript) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLang(record.handoff.detected_lang);
    speech.setFinalText(record.transcript);
    setIntakeMode("assistant");
    applyAgentApplicant(record.handoff);
    setStep("describe");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The agent's handoff is its "next step" trigger: seed the transcript and
  // run the records gate without a manual click.
  useEffect(() => {
    if (!live.handoff) return;
    const handoff = live.handoff;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLang(handoff.detected_lang);
    applyAgentApplicant(handoff);
    const text = composeIntakeTranscript(handoff, live.userText);
    if (!text) {
      setStep("describe");
      return;
    }
    speech.setFinalText(text);
    setUserCorrected(false);
    setErr(null);
    setTranscript(text);
    setAdvancing(true);
    void (async () => {
      const ok = await runNotes(text, handoff);
      setAdvancing(false);
      if (!ok) setStep("describe");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.handoff]);

  /** Copy whatever the agent collected into the applicant form. */
  function applyAgentApplicant(handoff: IntakeHandoff) {
    if (!hasApplicantData(handoff.applicant)) return;
    const captured = handoff.applicant;
    const touched = new Set<keyof ApplicantDetails>();
    setApplicant((previous) => {
      const next = { ...previous };
      const assign = <K extends keyof ApplicantDetails>(key: K, value: ApplicantDetails[K] | null) => {
        if (value === null || value === undefined || value === "") return;
        // Never overwrite something the citizen typed themselves.
        if (previous[key] !== emptyApplicant()[key]) return;
        next[key] = value;
        touched.add(key);
      };
      assign("name", captured.name);
      assign("gender", captured.gender);
      assign("address", captured.address);
      assign("pincode", captured.pincode);
      assign("state", captured.state);
      assign("areaStatus", captured.areaStatus);
      assign("educationalStatus", captured.educationalStatus);
      assign("mobile", captured.mobile);
      assign("phone", captured.phone);
      assign("email", captured.email);
      if (captured.isBpl !== null) {
        next.isBpl = captured.isBpl;
        touched.add("isBpl");
      }
      if (next.pincode && next.pincode.length === 6) {
        const lookup = lookupPincode(next.pincode);
        if (lookup) {
          if (!next.state) {
            next.state = lookup.state;
            touched.add("state");
          }
          if (previous.areaStatus === emptyApplicant().areaStatus && !captured.areaStatus) {
            next.areaStatus = lookup.areaStatus;
            touched.add("areaStatus");
          }
        }
      }
      return next;
    });
    setPrefilled(touched);
  }

  const spokenText = spokenTranscript(speech.finalText, speech.interimText);
  const correction = userCorrected ? manualText : spokenText || manualText;
  const listening = speech.status === "listening";
  const stepIndex = STEP_IDS.indexOf(step);

  /* ---------- gates ---------- */

  async function runNotes(text: string, handoff?: IntakeHandoff): Promise<boolean> {
    setBusy("notes");
    setErr(null);
    try {
      const intake: IntakeHints | undefined = handoff
        ? {
            summary: handoff.summary,
            place: handoff.place,
            date_range: handoff.date_range,
            authority_hint: handoff.authority_hint,
            jurisdiction: handoff.jurisdiction,
            state_name: handoff.state_name,
            jurisdiction_note: handoff.jurisdiction_note,
          }
        : undefined;
      const response = await postJSON<NotesResp>("/api/agent/notes", { transcript: text, lang, intake });
      setNotes(response.data);
      setCandidates([]);
      setRetrieved([]);
      setStep("request");
      return true;
    } catch (cause) {
      setErr(cause instanceof Error ? cause.message : "Could not reach the service.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  function finishDescribing() {
    speech.stop();
    const final = correction.trim();
    if (final.length < 10) {
      setErr("Tell us a little more about the problem before we continue.");
      return;
    }
    setErr(null);
    setTranscript(final);
    void runNotes(final);
  }

  async function checkEligibility() {
    if (!notes) return;
    setBusy("guard");
    setErr(null);
    try {
      const response = await postJSON<GuardResp>("/api/agent/guard", { notes, transcript });
      setGuard(response.data);
      setStep("eligibility");
    } catch (cause) {
      setErr(cause instanceof Error ? cause.message : "The eligibility check failed.");
    } finally {
      setBusy(null);
    }
  }

  async function writeApplication() {
    if (!notes) return;
    setBusy("draft");
    setErr(null);
    try {
      const response = await postJSON<DraftResp>("/api/agent/draft", { notes });
      setDraft(response.data);
      setCandidates([]);
      setRetrieved([]);
      setStep("application");
    } catch (cause) {
      setErr(cause instanceof Error ? cause.message : "Writing the application failed.");
    } finally {
      setBusy(null);
    }
  }

  async function matchAuthority() {
    if (!notes) return;
    if (candidates.length > 0) {
      setStep("authority");
      return;
    }
    setBusy("explain");
    setErr(null);
    try {
      const response = await postJSON<ExplainResp>("/api/agent/explain", { notes, transcript, draft });
      setRetrieved(response.retrieved ?? []);
      setReviewRequired(Boolean(response.review_required) && (response.data?.candidates.length ?? 0) === 0);
      setCandidates(response.data?.candidates ?? []);
      setPicked(null);
      setStep("authority");
    } catch (cause) {
      setErr(cause instanceof Error ? cause.message : "Finding the authority failed.");
    } finally {
      setBusy(null);
    }
  }

  function useReframing() {
    if (!guard?.safe_reframing) return;
    const next = `${transcript}\n[Reframed ask] ${guard.safe_reframing}`;
    setTranscript(next);
    setGuard(null);
    void runNotes(next);
  }

  /* ---------- edits invalidate downstream state ---------- */

  function editNotes(next: Notes) {
    setNotes(next);
    setGuard(null);
    setDraft(null);
    resetRouting();
  }

  function editDraft(next: Draft) {
    setDraft(next);
    resetRouting();
  }

  function resetRouting() {
    setCandidates([]);
    setRetrieved([]);
    setPicked(null);
    setManualAuthority(null);
    setReviewRequired(false);
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

  /* ---------- derived ---------- */

  const nameOf = (id: string) =>
    retrieved.find((item) => item.id === id)?.name ?? manualAuthority?.name ?? id;
  const ministryOf = (id: string) =>
    retrieved.find((item) => item.id === id)?.ministry ?? manualAuthority?.ministry ?? "";

  const report = buildReport({
    reference,
    transcript,
    notes,
    draft,
    authorityName: picked ? nameOf(picked) : "Not selected",
    ministry: picked ? ministryOf(picked) : "",
  });

  const bodyText = applicationText(report);
  const charCount = applicationLength(report);
  const badCharacters = disallowedCharacters(report);
  const rules = filingRulesFor({
    caseType: "RTI_REQUEST",
    jurisdiction: jurisdictionFromNotes(notes?.jurisdiction),
  });
  const overLimit = charCount > rules.text.maxCharacters;

  const draftValid = Boolean(
    draft
    && draft.title.trim().length > 0
    && draft.requests.length >= 3
    && draft.requests.every((request) => request.trim().length >= 20),
  );

  const stateMatter = notes?.jurisdiction === "state";

  /* ---------- applicant + review ---------- */

  function continueFromApplicant() {
    const found = [
      ...validateApplicant(applicant, { mobileRequired: rules.applicant.mobileRequired }),
      ...validateApplicantAgainstRules(applicant, rules).map((item) => ({
        field: item.code === "MOBILE_REQUIRED" ? "mobile" as const : item.code === "EMAIL_REQUIRED" ? "email" as const : "bplDocument" as const,
        message: item.message,
      })),
    ];
    const unique = found.filter((item, index, list) => list.findIndex((row) => row.field === item.field && row.message === item.message) === index);
    setProblems(unique);
    if (unique.length > 0) {
      setErr("Some details still need attention. They are marked below.");
      return;
    }
    if (!emailVerified) {
      setErr("Verify your email address before continuing.");
      return;
    }
    if (!picked || !draft || !notes) {
      setErr("Complete the application and choose an authority first.");
      return;
    }
    if (overLimit || badCharacters.length > 0) setUseTextAttachment(true);
    setErr(null);
    setSavedApplication(null);
    setStorageMessage(null);
    setApplicationPdf(createApplicationPdf({ report, applicant }));
    setStep("review");
  }

  async function createAcknowledgement() {
    if (!applicationPdf || !picked || !draft) return;
    if (savedApplication && savedCase) {
      setStep("acknowledgement");
      return;
    }
    setSavingApplication(true);
    setErr(null);
    try {
      const acknowledgementNumber = makeAcknowledgementNumber();
      const seed: Omit<StoredApplication, "applicationPdfBase64" | "receiptPdfBase64"> = {
        acknowledgementNumber,
        reference,
        createdAt: new Date().toISOString(),
        status: "PRAJA_ACKNOWLEDGED",
        governmentSubmissionStatus: "NOT_SUBMITTED",
        applicant: { ...applicant, email: applicant.email.trim().toLowerCase() },
        report,
      };
      const finalPdf = createApplicationPdf({ report, applicant: seed.applicant, acknowledgementNumber });
      const receiptPdf = createReceiptPdf(seed);
      const record: StoredApplication = {
        ...seed,
        applicationPdfBase64: await blobToBase64(finalPdf),
        receiptPdfBase64: await blobToBase64(receiptPdf),
      };
      const storage = await saveApplication(record);
      const caseRecord = await createBlankCase({
        caseType: "RTI_REQUEST",
        ownerEmail: seed.applicant.email,
        jurisdiction: jurisdictionFromNotes(notes?.jurisdiction),
        authorityName: nameOf(picked),
        language: lang,
        title: draft.title,
      });
      caseRecord.prajaReference = acknowledgementNumber;
      caseRecord.accessTokenHash = await hashAccessToken(acknowledgementNumber);
      caseRecord.legacyAcknowledgementNumber = acknowledgementNumber;
      caseRecord.authorityCode = picked;
      caseRecord.filingChannel = rules.filingChannel;
      caseRecord.preparationStatus = "PACKET_GENERATED";
      caseRecord.applicant = { ...seed.applicant, ownerEmail: seed.applicant.email };
      const portalText = useTextAttachment || overLimit ? coveringStatement(draft.title) : applicationText(report);
      caseRecord.draft.payload = {
        kind: "RTI_REQUEST",
        transcript,
        notes,
        draft,
        report,
        portalText,
        coveringStatement: useTextAttachment || overLimit ? coveringStatement(draft.title) : null,
        usesSupportingTextPdf: useTextAttachment || overLimit,
        lifeOrLiberty: false,
        thirdParty: Boolean(guard?.third_party_notice),
        authorityCode: picked,
      };
      caseRecord.draft.portalText = portalText;
      caseRecord.draft.characterCount = portalText.length;
      caseRecord.draft.confirmedAt = seed.createdAt;
      const appMeta = attachmentMeta(caseRecord, { name: "praja-rti-application.pdf", kind: "APPLICATION_PDF", blob: finalPdf }, finalPdf.size);
      const receiptMeta = attachmentMeta(caseRecord, { name: "praja-rti-acknowledgement.pdf", kind: "RECEIPT_PDF", blob: receiptPdf }, receiptPdf.size);
      await putAttachmentBlob({ id: appMeta.id, caseId: caseRecord.id, mimeType: "application/pdf", bytes: await blobToBytes(finalPdf).then((b) => b.buffer as ArrayBuffer) });
      await putAttachmentBlob({ id: receiptMeta.id, caseId: caseRecord.id, mimeType: "application/pdf", bytes: await blobToBytes(receiptPdf).then((b) => b.buffer as ArrayBuffer) });
      caseRecord.attachments.push(appMeta, receiptMeta);
      if (applicant.isBpl && applicant.bplDocument?.dataUrl) {
        const raw = applicant.bplDocument.dataUrl.replace(/^data:[^;]+;base64,/, "");
        const binary = Uint8Array.from(atob(raw), (ch) => ch.charCodeAt(0));
        const bplMeta = attachmentMeta(
          caseRecord,
          { name: applicant.bplDocument.name, kind: "BPL_PROOF", blob: new Blob([binary], { type: applicant.bplDocument.type }) },
          binary.byteLength,
        );
        bplMeta.verificationStatus = applicant.bplDocument.status === "valid" ? "VALID" : applicant.bplDocument.status === "flagged" ? "INVALID" : "UNVERIFIED_REVIEW_REQUIRED";
        await putAttachmentBlob({ id: bplMeta.id, caseId: caseRecord.id, mimeType: applicant.bplDocument.type, bytes: binary.buffer });
        caseRecord.attachments.push(bplMeta);
      }
      if (useTextAttachment || overLimit) {
        const full = createFullRequestPdf(caseRecord);
        const fullMeta = attachmentMeta(caseRecord, { name: "full-request.pdf", kind: "FULL_REQUEST_PDF", blob: full }, full.size);
        await putAttachmentBlob({ id: fullMeta.id, caseId: caseRecord.id, mimeType: "application/pdf", bytes: await blobToBytes(full).then((b) => b.buffer as ArrayBuffer) });
        caseRecord.attachments.push(fullMeta);
      }
      caseRecord.packet = {
        generatedAt: seed.createdAt,
        documentIds: caseRecord.attachments.map((item) => item.id),
        zipAttachmentId: null,
        ruleVersion: rules.id,
      };
      await saveCase(caseRecord);
      setApplicationPdf(finalPdf);
      setSavedApplication(record);
      setSavedCase(caseRecord);
      setStorageMessage(
        storage === "server-and-device"
          ? "Saved to the case database and to this device."
          : "Saved on this device only. The server database was unavailable in this session.",
      );
      setStep("acknowledgement");
    } catch {
      setErr("The acknowledgement could not be saved. Your application is intact; try again.");
    } finally {
      setSavingApplication(false);
    }
  }

  async function copyApplication() {
    try {
      await navigator.clipboard.writeText(bodyText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setErr("Could not copy. Download the text instead.");
    }
  }

  function startOver() {
    live.stop();
    clearIntakeRecord();
    speech.reset();
    setStep("language");
    setIntakeMode(null);
    setTranscript("");
    setManualText("");
    setUserCorrected(false);
    setNotes(null);
    setGuard(null);
    setDraft(null);
    resetRouting();
    setApplicant(emptyApplicant());
    setPrefilled(new Set());
    setProblems([]);
    setErr(null);
  }

  return (
    <main className="workspace">
      <SiteMasthead
        compact
        notice={
          liveReady
            ? "Your voice is processed in real time to transcribe it. Audio is not stored by this site."
            : "Only the text you confirm is analysed. Audio is not sent."
        }
        links={
          <>
            <Link href="/departments">Authority directory</Link>
            <a href="https://rtionline.gov.in/" rel="noreferrer" target="_blank">Official RTI portal</a>
          </>
        }
        truth={
          <>
            <strong>Important:</strong> This workspace prepares an application. It does not file with, or connect
            to, any government system.
          </>
        }
      >
        <Link className="header-action" href="/cases">My RTI cases</Link>
      </SiteMasthead>

      <StepBar current={step} index={stepIndex} onJump={(next) => { setErr(null); setStep(next); }} />

      <div className="workspace-body site-container" id="main-content">
        <article className="workspace-panel">
          {advancing ? (
            <Advancing />
          ) : (
            <>
              {step === "language" && (
                <LanguageStep
                  lang={lang}
                  setLang={setLang}
                  liveReady={liveReady}
                  live={live}
                  speechSupported={speech.supported}
                  onManual={() => {
                    live.stop();
                    clearIntakeRecord();
                    setIntakeMode("manual");
                    setErr(null);
                    setStep("describe");
                  }}
                  onReviewSpoken={() => {
                    const text = live.userText.trim().slice(0, 6000);
                    if (!text) return;
                    speech.setFinalText(text);
                    setUserCorrected(false);
                    setIntakeMode("assistant");
                    setErr(null);
                    setStep("describe");
                  }}
                />
              )}

              {step === "describe" && (
                <DescribeStep
                  lang={lang}
                  intakeMode={intakeMode}
                  listening={listening}
                  speech={speech}
                  correction={correction}
                  onCorrection={(value) => {
                    setUserCorrected(true);
                    setManualText(value);
                  }}
                  onTakeOver={() => {
                    if (!userCorrected) {
                      setManualText(spokenText || manualText);
                      setUserCorrected(true);
                    }
                  }}
                  onStart={() => {
                    if (userCorrected) {
                      speech.setFinalText(manualText.trim());
                      setUserCorrected(false);
                    }
                    setErr(null);
                    speech.start();
                  }}
                  onStop={() => {
                    speech.stop();
                    if (!userCorrected) {
                      const snapshot = spokenText || manualText;
                      if (snapshot) {
                        setManualText(snapshot);
                        setUserCorrected(true);
                      }
                    }
                  }}
                  busy={busy === "notes"}
                  error={err}
                  onContinue={finishDescribing}
                  onBack={() => { setErr(null); setStep("language"); }}
                />
              )}

              {step === "request" && notes && (
                <RecordsStep
                  notes={notes}
                  onEdit={editNotes}
                  busy={busy === "guard"}
                  error={err}
                  onContinue={checkEligibility}
                  onBack={() => { setErr(null); setStep("describe"); }}
                />
              )}

              {step === "eligibility" && guard && (
                <EligibilityStep
                  guard={guard}
                  notes={notes}
                  busy={busy === "draft"}
                  error={err}
                  onContinue={writeApplication}
                  onReframe={useReframing}
                  onBack={() => { setErr(null); setStep("request"); }}
                  onStartOver={startOver}
                />
              )}

              {step === "application" && draft && (
                <ApplicationStep
                  draft={draft}
                  onEdit={editDraft}
                  charCount={charCount}
                  overLimit={overLimit}
                  badCharacters={badCharacters}
                  attachmentPath={useTextAttachment || overLimit}
                  onUseAttachmentPath={() => setUseTextAttachment(true)}
                  ruleLimit={rules.text.maxCharacters}
                  ruleVerifiedAt={rules.verifiedAt}
                  stateMatter={stateMatter}
                  copied={copied}
                  onCopy={copyApplication}
                  onDownload={() =>
                    downloadText(reportFilename(reference, "txt"), formatReportText(report), "text/plain;charset=utf-8")
                  }
                  busy={busy === "explain"}
                  valid={draftValid}
                  error={err}
                  onContinue={matchAuthority}
                  onBack={() => { setErr(null); setStep("eligibility"); }}
                />
              )}

              {step === "authority" && (
                <AuthorityStep
                  candidates={candidates}
                  retrieved={retrieved}
                  reviewRequired={reviewRequired}
                  notes={notes}
                  picked={picked}
                  onPick={selectAuthority}
                  nameOf={nameOf}
                  ministryOf={ministryOf}
                  browsing={browsingDirectory}
                  onToggleBrowse={() => setBrowsingDirectory((open) => !open)}
                  onManualPick={(code, name, ministry) => {
                    setManualAuthority({ pa_code: code, name, ministry, keywords: [] });
                    setRetrieved((previous) =>
                      previous.some((item) => item.id === code)
                        ? previous
                        : [...previous, { id: code, name, ministry, matched: [], score: 1 }],
                    );
                    selectAuthority(code);
                    setBrowsingDirectory(false);
                  }}
                  error={err}
                  onContinue={() => {
                    if (!picked) return;
                    setErr(null);
                    setStep("applicant");
                  }}
                  onBack={() => { setErr(null); setStep("application"); }}
                />
              )}

              {step === "applicant" && (
                <ApplicantStep
                  mobileRequired={rules.applicant.mobileRequired}
                  maxAttachmentBytes={rules.attachments.maxBytes}
                  applicant={applicant}
                  setApplicant={(next) => {
                    setApplicant(next);
                    setApplicationPdf(null);
                    setSavedApplication(null);
                  }}
                  problems={problems}
                  prefilled={prefilled}
                  emailVerified={emailVerified}
                  onVerified={(verified) => {
                    setApplicant((previous) => ({ ...previous, email: verified }));
                    setEmailVerified(true);
                    setErr(null);
                  }}
                  onSignOut={() => setEmailVerified(false)}
                  error={err}
                  onContinue={continueFromApplicant}
                  onBack={() => { setErr(null); setStep("authority"); }}
                />
              )}

              {step === "review" && (
                <ReviewStep
                  report={report}
                  applicant={applicant}
                  pdfUrl={applicationPdfUrl}
                  charCount={charCount}
                  saving={savingApplication}
                  ready={Boolean(applicationPdf)}
                  error={err}
                  onDownload={() =>
                    applicationPdf && downloadBlob("praja-rti-application-preview.pdf", applicationPdf)
                  }
                  onContinue={() => void createAcknowledgement()}
                  onBack={() => { setErr(null); setStep("applicant"); }}
                />
              )}

              {step === "acknowledgement" && savedApplication && (
                <>
                  <AcknowledgementStep
                    record={savedApplication}
                    storageMessage={storageMessage}
                    onBack={() => { setErr(null); setStep("review"); }}
                    onStartOver={startOver}
                  />
                  {savedCase && (
                    <ExternalFilingHandoff
                      rules={rules}
                      bpl={applicant.isBpl}
                      caseId={savedCase.id}
                      stateMatter={stateMatter}
                    />
                  )}
                </>
              )}
            </>
          )}
        </article>

        <aside className="workspace-aside">
          <ProgressCard step={step} notes={notes} picked={picked} nameOf={nameOf} charCount={charCount} />
        </aside>
      </div>
    </main>
  );
}

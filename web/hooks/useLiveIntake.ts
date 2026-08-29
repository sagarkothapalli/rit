"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  LIVE_INTAKE_SYSTEM,
  normalizeHandoff,
  submitIntakeDeclaration,
  type IntakeHandoff,
} from "@/lib/live/intakePrompt";
import { createPlaybackQueue, int16ToBase64, type PlaybackQueue } from "@/lib/live/audio";
import { saveIntakeRecord, clearIntakeRecord } from "@/lib/live/intakeMemory";
import { createSessionMemory, type SessionMemory } from "@/lib/live/sessionMemory";
import {
  detectHoldIntent,
  detectOfferedHandoff,
  detectProceedIntent,
  hasEnoughForHandoff,
  synthesizeHandoff,
} from "@/lib/live/proceed";
import { detectIdentityProbe, IDENTITY_NUDGE, redactIdentity } from "@/lib/live/identity";
import { detectOffTopic, OFF_TOPIC_NUDGE } from "@/lib/live/scope";
import { classifyJurisdiction, type JurisdictionVerdict } from "@/lib/jurisdiction";
import {
  BRIEFING_INTERVAL_MS,
  LIVE_VOICE,
  INPUT_MIME,
  SESSION_HARD_CLOSE_MS,
  SESSION_SOFT_WRAP_MS,
  TURN_SILENCE_MS,
  VAD_PREFIX_PADDING_MS,
  VAD_SILENCE_MS,
  WORKLET_PATH,
} from "@/lib/live/constants";

/* ============================================================
   Gemini Live intake hook. One conversational session that
   detects the citizen's language, takes their complaint, and
   ends with the submit_intake handoff. Every failure path
   keeps the captured text so the citizen can continue typing.

   Two rules govern everything the app injects into the
   conversation, both learned the hard way:

   1. ONE TURN. Every note the app wants the agent to act on —
      the identity answer, the jurisdiction verdict, the memory
      briefing, the handoff order — is coalesced by
      `SessionMemory` into a single injected turn. Sending them
      separately made the agent talk over itself.

   2. ONLY IN A GAP. Notes are injected at a turn boundary and
      only after the citizen has been quiet for TURN_SILENCE_MS.
      Injecting mid-sentence is what made the agent interrupt
      the citizen and then wander off on its own thread.

   The memory itself is per-session and in-process: created in
   start(), discarded on stop(). Nothing about the conversation
   in progress is written to storage.
   ============================================================ */

export type LiveStatus =
  | "idle"
  | "connecting"
  | "active"
  | "wrapup"
  | "done"
  | "ended"
  | "failed";

interface LivePart {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
}

interface LiveMessage {
  setupComplete?: unknown;
  goAway?: unknown;
  serverContent?: {
    inputTranscription?: { text?: string };
    outputTranscription?: { text?: string };
    modelTurn?: { parts?: LivePart[] };
    interrupted?: boolean;
    turnComplete?: boolean;
  };
  toolCall?: { functionCalls?: Array<{ id?: string; name?: string; args?: Record<string, unknown> }> };
}

interface LiveSessionLike {
  close(): void;
  sendClientContent(params: unknown): void;
  sendRealtimeInput(params: unknown): void;
  sendToolResponse(params: unknown): void;
}

interface WorkletMessage {
  type?: string;
  buffer?: ArrayBuffer;
}

/**
 * The model stays mute until something arrives, so the session
 * opens with an injected turn rather than a real one. Two short
 * sentences: who is speaking, and one invitation to talk. Longer
 * openings were where the monologue started.
 */
const GREETING_NUDGE =
  "(Session start. The citizen has not spoken yet. Open in English with exactly two short spoken sentences and"
  + " nothing more: say you are their RTI agent, then invite them to describe the problem in their own words."
  + " Do NOT list options, capabilities, or disclaimers, do NOT ask a second question, and do NOT name any model,"
  + " company, or technology. Then stop and listen.)";

const WRAP_NUDGE =
  "(Time is nearly up. In the citizen's language, in one short sentence, state their complaint back for the record, then call submit_intake immediately in the same turn. Do not ask any more questions.)";

/**
 * Sent the moment the citizen says they are finished. The model
 * otherwise answers "I am drafting your request, anything else?"
 * and loops there forever, because nothing in the conversation
 * forces the tool call.
 */
const PROCEED_NUDGE =
  "(System note, not spoken by the citizen. The citizen has just confirmed they are finished and want you to proceed."
  + " Do NOT ask another question — not about their name, their address, their contact details, or anything else."
  + " Do NOT say you are drafting and then wait. In THIS turn: say one short line in their language stating their"
  + " complaint back for the record and telling them it is being prepared, and call submit_intake in the same turn"
  + " with everything you captured. The next stage of the site cannot start until you call the tool.)";

/**
 * If the model ignores the nudge, the app stops waiting on it and
 * builds the handoff itself. The citizen said "proceed"; an intake
 * that never ends is a worse outcome than a draft they can edit.
 */
const FORCE_HANDOFF_MS = 6000;

/** Steers the model to stop after the handoff instead of drifting back into chat. */
const HANDOFF_ACK =
  "Intake captured successfully. The session is now complete: say exactly one short goodbye line in the citizen's"
  + " language and stop. Do NOT ask any further questions, do NOT offer more help, and do NOT offer to take another"
  + " complaint or start a new request — this session prepares one request and it is done. The citizen carries on"
  + " on screen.";

const FALLBACK_HINT = "Pick a language below and continue instead.";

/**
 * Deterministic backstop for the jurisdiction flag. The system prompt asks
 * the model to volunteer that a ward road or municipal complaint is a State
 * matter, but the citizen must be told even when the model forgets. As soon
 * as the running transcript classifies as a State matter, we queue the
 * verdict so the agent speaks it in the citizen's language.
 */
function stateFlagNote(verdict: JurisdictionVerdict): string {
  const body = verdict.localBody?.name ?? verdict.recommendedBody ?? "the relevant State department or local body";
  const state = verdict.stateName ? ` in ${verdict.stateName}` : "";
  return [
    "(System note, not spoken by the citizen. Jurisdiction triage has run on what the citizen has said so far:",
    `this is a STATE / local-body matter${state}, not a Central government one.`,
    `The records are held by ${body}.`,
    "Once the citizen has finished speaking, in the citizen's language and in one or two short sentences, tell them:",
    "(1) this is not a Central government matter and you cannot file it — you only file with Central government",
    "authorities, not State governments or municipal bodies, (2) RTI Online — this Central portal — cannot accept it,",
    `(3) they must approach ${body}.`,
    "Then reassure them you will still prepare the complete application addressed to that authority, and continue the intake.",
    "Do not repeat this flag later in the conversation. When you call submit_intake, set jurisdiction to \"state\"",
    `and authority_hint to "${body}".)`,
  ].join(" ");
}

/**
 * The correction that was missing, and the reason this file changed: the
 * citizen names a Central authority — "NHAI", "EPFO", "this is a central
 * government complaint" — and the agent still announces it as a municipal
 * issue, because the surrounding words are all civic ones. The classifier
 * settles it deterministically; this tells the agent so, before it guesses.
 *
 * Sent whenever the verdict is Central by name, so it lands both as a
 * pre-emptive instruction and as a correction if the agent already misspoke.
 */
function centralFlagNote(verdict: JurisdictionVerdict): string {
  const body = verdict.recommendedBody ?? "the Central public authority the citizen named";
  const aside = verdict.alsoMentioned
    ? ` The citizen also mentioned ${verdict.alsoMentioned}; that does NOT make this a municipal or State matter, because they named the authority that holds these records.`
    : "";
  return [
    "(System note, not spoken by the citizen. Jurisdiction triage has run on what the citizen has said so far:",
    `the citizen has NAMED a CENTRAL public authority — ${body} — so this is a CENTRAL government matter and it CAN be filed on RTI Online.${aside}`,
    "Do NOT tell the citizen this is a municipal, corporation, ward, panchayat, or State government issue.",
    "Do NOT suggest they approach a municipal corporation or a State department.",
    "If you have already said any of that, correct yourself in one short sentence in their language — say that these",
    `records are held by ${body} and the application will be addressed there — then carry straight on with the intake.`,
    `When you call submit_intake, set jurisdiction to "central" and authority_hint to "${body}".)`,
  ].join(" ");
}

/**
 * The deterministic verdict has the final say on jurisdiction. The model may
 * have missed the flag or mislabelled a ward road as Central; the citizen's
 * application must still be addressed correctly.
 */
function reconcileJurisdiction(handoff: IntakeHandoff, verdict: JurisdictionVerdict): IntakeHandoff {
  if (verdict.level === "unclear") return handoff;
  if (verdict.level === "central") {
    /*
     * A named Central authority overrules the model outright, including a
     * "state" label and a municipal authority_hint it may have written.
     * Anything less confident only fills a gap.
     */
    if (verdict.namedAuthority) {
      return {
        ...handoff,
        jurisdiction: "central",
        jurisdiction_note: handoff.jurisdiction_note ?? (verdict.reasons.join(" ") || null),
        authority_hint: verdict.recommendedBody ?? handoff.authority_hint,
      };
    }
    return handoff.jurisdiction === "state" ? handoff : { ...handoff, jurisdiction: "central" };
  }
  const body = verdict.localBody?.name ?? verdict.recommendedBody;
  return {
    ...handoff,
    jurisdiction: "state",
    state_name: handoff.state_name ?? verdict.stateName,
    jurisdiction_note: handoff.jurisdiction_note ?? (verdict.reasons.join(" ") || null),
    // Never let a Central authority guess stand as the records holder.
    authority_hint: body ?? handoff.authority_hint,
  };
}

export function useLiveIntake() {
  const [status, setStatus] = useState<LiveStatus>("idle");
  const [supported, setSupported] = useState(false);
  const [agentText, setAgentText] = useState("");
  const [userText, setUserText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<IntakeHandoff | null>(null);
  /** Live jurisdiction verdict, surfaced in the panel while the citizen talks. */
  const [jurisdiction, setJurisdiction] = useState<JurisdictionVerdict | null>(null);

  const statusRef = useRef<LiveStatus>("idle");
  const sessionRef = useRef<LiveSessionLike | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inCtxRef = useRef<AudioContext | null>(null);
  const outCtxRef = useRef<AudioContext | null>(null);
  const nodeRef = useRef<AudioWorkletNode | null>(null);
  const queueRef = useRef<PlaybackQueue | null>(null);
  const softTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const proceedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Retries an injection that arrived while the citizen was still speaking. */
  const noteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<LiveMessage[]>([]);
  const userTextRef = useRef("");
  const agentTextRef = useRef("");
  const handoffRef = useRef<IntakeHandoff | null>(null);
  const closingRef = useRef(false);
  const jurisdictionRef = useRef<JurisdictionVerdict | null>(null);
  /**
   * Per-session working memory. Created in start(), dropped on reset() — it
   * is never persisted, and a new request always begins with a blank one.
   */
  const memoryRef = useRef<SessionMemory>(createSessionMemory());
  /** True once the jurisdiction has been stated to the citizen, either way. */
  const flaggedRef = useRef(false);
  /** When the memory briefing was last injected. */
  const briefedAtRef = useRef(0);
  /** Set when the citizen says they are finished; cleared once acted on. */
  const pendingProceedRef = useRef(false);
  /** Mirrors the ref for rendering — the citizen sees "proceed" land. */
  const [proceeding, setProceeding] = useState(false);
  /** Transcript length already scanned for a confirmation. */
  const proceedConsumedRef = useRef(0);
  /** How many times we have had to push the model towards the handoff. */
  const proceedNudgesRef = useRef(0);
  /** Transcript length already scanned for an identity question. */
  const identityConsumedRef = useRef(0);
  const offTopicConsumedRef = useRef(0);

  useEffect(() => {
    const ok =
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof window !== "undefined" &&
      Boolean(window.AudioWorkletNode) &&
      Boolean(window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(ok);
  }, []);

  const setPhase = useCallback((phase: LiveStatus) => {
    statusRef.current = phase;
    setStatus(phase);
  }, []);

  const appendUser = useCallback((text: string) => {
    if (!text) return;
    userTextRef.current = `${userTextRef.current} ${text}`.replace(/\s+/g, " ").trim().slice(0, 6000);
    setUserText(userTextRef.current);

    // The session memory re-derives the established facts on every chunk.
    // The verdict is cheap, and the citizen may only name their city several
    // sentences in.
    const memory = memoryRef.current;
    memory.noteCitizen(text);
    const verdict = classifyJurisdiction(userTextRef.current);
    if (verdict.level !== jurisdictionRef.current?.level
      || verdict.localBody?.pa_code !== jurisdictionRef.current?.localBody?.pa_code) {
      jurisdictionRef.current = verdict;
      setJurisdiction(verdict);
    }

    /*
     * Queue the jurisdiction verdict, in whichever direction it points. Both
     * directions matter: a ward drain must be flagged as a State matter, and
     * a citizen who names NHAI must not be told their complaint is municipal.
     * Queued only — it is injected in a gap between turns, never mid-sentence.
     */
    if (!flaggedRef.current && verdict.confidence >= 0.6) {
      if (verdict.level === "state") {
        memory.queue("jurisdiction", stateFlagNote(verdict));
      } else if (verdict.level === "central" && verdict.namedAuthority) {
        memory.queue("jurisdiction", centralFlagNote(verdict));
      }
    }

    // "What model are you?" Recognised here so the answer comes from an
    // instruction issued a moment earlier, rather than from whatever the
    // model believes about itself.
    if (
      userTextRef.current.length > identityConsumedRef.current + 4
      && detectIdentityProbe(text)
    ) {
      identityConsumedRef.current = userTextRef.current.length;
      memory.queue("identity", IDENTITY_NUDGE);
    }

    // "What's the weather?" / "Can you google it?" Recognised here so the
    // refusal is an instruction the model has just been given, rather than
    // left to its general helpfulness — which answers, or worse, promises to
    // look it up on an internet this session has no path to.
    if (
      userTextRef.current.length > offTopicConsumedRef.current + 4
      && detectOffTopic(text)
    ) {
      offTopicConsumedRef.current = userTextRef.current.length;
      memory.queue("scope", OFF_TOPIC_NUDGE);
    }

    // "That's it, proceed." Recognised here rather than left to the model,
    // which otherwise keeps promising to draft and asking one more question.
    // Matched against the tail of the transcript, and only for speech we have
    // not already acted on, so one confirmation cannot fire repeatedly.
    if (!handoffRef.current) {
      if (detectHoldIntent(text)) {
        // "Wait, one more thing" after a confirmation cancels it.
        pendingProceedRef.current = false;
        setProceeding(false);
        memory.cancel("proceed");
        if (proceedTimerRef.current) {
          clearTimeout(proceedTimerRef.current);
          proceedTimerRef.current = null;
        }
      } else if (
        userTextRef.current.length > proceedConsumedRef.current + 4
        && (
          detectProceedIntent(userTextRef.current)
          // "Shall I prepare your application now?" — "yes." A bare yes only
          // counts when the agent has just offered; mid-intake it is the
          // answer to whatever was asked.
          || detectOfferedHandoff(agentTextRef.current, text)
        )
      ) {
        proceedConsumedRef.current = userTextRef.current.length;
        pendingProceedRef.current = true;
        setProceeding(true);
      }
    }
  }, []);

  /**
   * The one place the app speaks to the model outside a real turn.
   *
   * Everything queued — the identity answer, the jurisdiction verdict, the
   * memory briefing, the handoff order — goes out as a SINGLE turn, and only
   * once the citizen has been quiet for TURN_SILENCE_MS. Sending each note as
   * it was raised is what made the agent interrupt the citizen and then talk
   * over its own previous thought.
   *
   * If the citizen is still speaking, the injection is re-armed rather than
   * dropped: the note is still needed, just not yet.
   */
  const flushNotes = useCallback(() => {
    /*
     * Named inner function so the retry can re-enter it. Re-arming beats
     * dropping: the note is still needed, we are only waiting for a gap.
     */
    const attempt = () => {
      if (noteTimerRef.current) {
        clearTimeout(noteTimerRef.current);
        noteTimerRef.current = null;
      }
      const memory = memoryRef.current;
      if (closingRef.current) return;
      if (statusRef.current !== "active" && statusRef.current !== "wrapup") return;
      if (!memory.pending()) return;
      // Transcription lags the audio, so a turn boundary is not proof of silence.
      if (memory.silenceMs() < TURN_SILENCE_MS) {
        noteTimerRef.current = setTimeout(attempt, TURN_SILENCE_MS);
        return;
      }
      const text = memory.drain();
      if (!text) return;
      try {
        sessionRef.current?.sendClientContent({ turns: { role: "user", parts: [{ text }] } });
      } catch {
        /* session may be closing — the notes gate re-checks jurisdiction downstream */
      }
    };
    attempt();
  }, []);

  const appendAgent = useCallback((text: string) => {
    if (!text) return;
    // The memory keeps the agent's questions so the briefing can forbid a
    // repeat — the raw stream, because a question can straddle two chunks.
    memoryRef.current.noteAgent(text);
    // Accumulate the raw stream, but redact the whole of it before it is
    // rendered. Transcription arrives in fragments, so a vendor name can
    // straddle two chunks — redacting a chunk in isolation would miss it.
    agentTextRef.current = `${agentTextRef.current} ${text}`.replace(/\s+/g, " ").trim().slice(0, 6000);
    setAgentText(redactIdentity(agentTextRef.current));
  }, []);

  const clearTimers = useCallback(() => {
    for (const ref of [softTimerRef, hardTimerRef, closeTimerRef, proceedTimerRef, noteTimerRef]) {
      if (ref.current) {
        clearTimeout(ref.current);
        ref.current = null;
      }
    }
  }, []);

  const teardownAudio = useCallback(() => {
    queueRef.current?.dispose();
    queueRef.current = null;
    try {
      nodeRef.current?.disconnect();
    } catch {
      /* noop */
    }
    nodeRef.current = null;
    for (const ref of [inCtxRef, outCtxRef]) {
      const ctx = ref.current;
      if (ctx) {
        ref.current = null;
        void ctx.close().catch(() => undefined);
      }
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const fail = useCallback(
    (err: Error) => {
      clearTimers();
      teardownAudio();
      try {
        sessionRef.current?.close();
      } catch {
        /* noop */
      }
      sessionRef.current = null;
      setPhase("failed");
      setError(err.message || `Voice session failed. ${FALLBACK_HINT}`);
    },
    [clearTimers, teardownAudio, setPhase]
  );

  const wrapUp = useCallback(() => {
    if (statusRef.current !== "active") return;
    setPhase("wrapup");
    try {
      sessionRef.current?.sendClientContent({ turns: { role: "user", parts: [{ text: WRAP_NUDGE }] } });
    } catch {
      /* session may be closing */
    }
  }, [setPhase]);

  /**
   * Normalises and publishes a handoff. Deliberately does not touch
   * the session or the phase, so it is safe to call while closing.
   */
  const publishHandoff = useCallback((raw: IntakeHandoff): boolean => {
    if (handoffRef.current) return false;
    const normalized = reconcileJurisdiction(raw, classifyJurisdiction(userTextRef.current));
    handoffRef.current = normalized;
    pendingProceedRef.current = false;
    setProceeding(false);
    if (proceedTimerRef.current) {
      clearTimeout(proceedTimerRef.current);
      proceedTimerRef.current = null;
    }
    setHandoff(normalized);
    // Persist the intake so a refresh mid-flow never loses the complaint.
    saveIntakeRecord({
      handoff: normalized,
      transcript: userTextRef.current.trim(),
      capturedAt: Date.now(),
    });
    return true;
  }, []);

  /**
   * The single place a live handoff becomes real, whether the model
   * produced it or the app synthesised it. Publishes it and closes
   * the session so the workspace can advance.
   */
  const commitHandoff = useCallback(
    (raw: IntakeHandoff) => {
      if (!publishHandoff(raw)) return;
      if (statusRef.current === "active") setPhase("wrapup");
      closeTimerRef.current = setTimeout(() => {
        closingRef.current = true;
        try {
          sessionRef.current?.close();
        } catch {
          /* noop */
        }
      }, 2500);
    },
    [publishHandoff, setPhase]
  );

  /**
   * The citizen said "proceed" and the model still has not called
   * the tool. Build the handoff from the transcript and move on;
   * every field is editable in the steps that follow.
   */
  const forceHandoff = useCallback(() => {
    if (handoffRef.current || !pendingProceedRef.current) return;
    if (!hasEnoughForHandoff(userTextRef.current)) return;
    commitHandoff(synthesizeHandoff(userTextRef.current, jurisdictionRef.current ?? undefined));
  }, [commitHandoff]);

  /**
   * Explicit "I'm done" from the citizen, pressed on screen. Same
   * path as the spoken confirmation, minus the waiting: the button
   * exists so the citizen is never at the model's mercy.
   */
  const finish = useCallback((): boolean => {
    if (handoffRef.current) return true;
    if (!hasEnoughForHandoff(userTextRef.current)) return false;
    pendingProceedRef.current = true;
    setProceeding(true);
    commitHandoff(synthesizeHandoff(userTextRef.current, jurisdictionRef.current ?? undefined));
    return true;
  }, [commitHandoff]);

  /**
   * Acted on at turn boundaries: ask the model once (twice at
   * most) to hand off, and start the timer that stops waiting.
   * The order goes through the same single-turn queue as every
   * other note, so it cannot arrive as a second interruption.
   */
  const queueProceedIntent = useCallback(() => {
    if (!pendingProceedRef.current || handoffRef.current || closingRef.current) return;
    if (statusRef.current !== "active" && statusRef.current !== "wrapup") return;
    if (!hasEnoughForHandoff(userTextRef.current)) {
      // "Proceed" before there is a concern to file — nothing to hand off yet.
      pendingProceedRef.current = false;
      setProceeding(false);
      return;
    }
    if (proceedNudgesRef.current >= 2) {
      forceHandoff();
      return;
    }
    proceedNudgesRef.current += 1;
    memoryRef.current.queue("proceed", PROCEED_NUDGE);
    if (proceedTimerRef.current) clearTimeout(proceedTimerRef.current);
    proceedTimerRef.current = setTimeout(() => forceHandoff(), FORCE_HANDOFF_MS);
  }, [forceHandoff]);

  /**
   * Everything the app wants to say between turns, decided in one
   * place so it can be sent as one turn.
   *
   * The memory briefing is the addition that stops the drift: it
   * re-states the facts the citizen has already given and the
   * questions the agent has already asked, so the agent continues
   * the conversation instead of restarting its own version of it.
   * It rides along with whatever else is queued, and otherwise goes
   * out on its own at most every BRIEFING_INTERVAL_MS.
   */
  const onTurnBoundary = useCallback(() => {
    const memory = memoryRef.current;
    if (closingRef.current) return;
    if (statusRef.current !== "active" && statusRef.current !== "wrapup") return;

    queueProceedIntent();

    // Once the verdict has been queued, the flag is spent: the agent is told
    // once, and the briefing carries the standing fact from then on.
    if (memory.pending()) {
      flaggedRef.current = true;
      memory.markJurisdictionSpoken();
    }

    const due = Date.now() - briefedAtRef.current >= BRIEFING_INTERVAL_MS;
    if ((memory.pending() || due) && memory.briefingIsStale() && !handoffRef.current) {
      const briefing = memory.briefing();
      if (briefing) {
        memory.queue("memory", briefing);
        briefedAtRef.current = Date.now();
      }
    }

    flushNotes();
  }, [flushNotes, queueProceedIntent]);

  const beginAudio = useCallback(async () => {
    const session = sessionRef.current;
    const stream = streamRef.current;
    if (!session || !stream) return;
    try {
      const outCtx = new AudioContext({ sampleRate: 24000 });
      outCtxRef.current = outCtx;
      if (outCtx.state === "suspended") await outCtx.resume();
      queueRef.current = createPlaybackQueue(outCtx);

      const inCtx = new AudioContext({ sampleRate: 16000 });
      inCtxRef.current = inCtx;
      if (inCtx.state === "suspended") await inCtx.resume();
      if (softTimerRef.current) {
        clearTimeout(softTimerRef.current);
        softTimerRef.current = null;
      }
      await inCtx.audioWorklet.addModule(WORKLET_PATH);
      const node = new AudioWorkletNode(inCtx, "pcm16k-resampler");
      nodeRef.current = node;
      node.port.onmessage = (event: MessageEvent<WorkletMessage>) => {
        const data = event.data;
        if (data?.type !== "pcm" || !data.buffer) return;
        if (closingRef.current || statusRef.current !== "active") return;
        try {
          sessionRef.current?.sendRealtimeInput({
            audio: { data: int16ToBase64(new Int16Array(data.buffer)), mimeType: INPUT_MIME },
          });
        } catch {
          /* transient send failure — the next chunk keeps flowing */
        }
      };
      const source = inCtx.createMediaStreamSource(stream);
      source.connect(node);
      const mute = inCtx.createGain();
      mute.gain.value = 0;
      node.connect(mute).connect(inCtx.destination);

      setPhase("active");
      softTimerRef.current = setTimeout(() => wrapUp(), SESSION_SOFT_WRAP_MS);
      hardTimerRef.current = setTimeout(() => {
        if (statusRef.current === "active" || statusRef.current === "wrapup") {
          closingRef.current = true;
          try {
            sessionRef.current?.close();
          } catch {
            /* noop */
          }
        }
      }, SESSION_HARD_CLOSE_MS);
    } catch {
      fail(new Error(`Could not start the microphone. ${FALLBACK_HINT}`));
    }
  }, [fail, setPhase, wrapUp]);

  const handleMessage = useCallback(
    (raw: unknown) => {
      const msg = raw as LiveMessage;
      if (msg.setupComplete) {
        // The model stays silent until it receives input — nudge it to greet.
        try {
          sessionRef.current?.sendClientContent({ turns: { role: "user", parts: [{ text: GREETING_NUDGE }] } });
        } catch {
          /* session may be closing */
        }
        void beginAudio();
        return;
      }
      const content = msg.serverContent;
      if (content?.inputTranscription?.text) appendUser(content.inputTranscription.text);
      if (content?.outputTranscription?.text) appendAgent(content.outputTranscription.text);
      if (content?.interrupted) queueRef.current?.flush();
      const parts = content?.modelTurn?.parts;
      if (parts) {
        for (const part of parts) {
          const blob = part.inlineData;
          if (blob?.data && (blob.mimeType ?? "audio/pcm").startsWith("audio/pcm")) {
            queueRef.current?.enqueueBase64(blob.data);
          }
        }
      }
      // A completed turn is the only safe moment to inject a system turn —
      // and even then only if the citizen has actually stopped speaking.
      if (content?.turnComplete) onTurnBoundary();
      if (msg.goAway && statusRef.current === "active") wrapUp();
      const calls = msg.toolCall?.functionCalls;
      if (calls) {
        for (const call of calls) {
          if (call.name !== "submit_intake") continue;
          commitHandoff(normalizeHandoff(call.args ?? {}));
          try {
            sessionRef.current?.sendToolResponse({
              functionResponses: [{ id: call.id, name: call.name, response: { ok: true, instruction: HANDOFF_ACK } }],
            });
          } catch {
            /* session may be closing */
          }
        }
      }
    },
    [appendAgent, appendUser, beginAudio, commitHandoff, onTurnBoundary, wrapUp]
  );

  const start = useCallback(async () => {
    const current = statusRef.current;
    if (current === "connecting" || current === "active" || current === "wrapup") return;
    closingRef.current = false;
    pendingRef.current = [];
    userTextRef.current = "";
    agentTextRef.current = "";
    handoffRef.current = null;
    jurisdictionRef.current = null;
    /*
     * A brand-new memory for every request. The intake is allowed to remember
     * everything within one conversation and nothing across two: this line is
     * the whole of that policy, and it is why the memory is never written to
     * sessionStorage or the server.
     */
    memoryRef.current = createSessionMemory();
    flaggedRef.current = false;
    briefedAtRef.current = Date.now();
    pendingProceedRef.current = false;
    setProceeding(false);
    proceedConsumedRef.current = 0;
    proceedNudgesRef.current = 0;
    identityConsumedRef.current = 0;
    offTopicConsumedRef.current = 0;
    clearIntakeRecord();
    setUserText("");
    setAgentText("");
    setHandoff(null);
    setJurisdiction(null);
    setError(null);
    setPhase("connecting");
    try {
      const res = await fetch("/api/live/token", { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        const message =
          body.error === "RATE_LIMITED"
            ? "Too many voice sessions right now — try again in a minute, or pick a language below."
            : `Voice assistant is unavailable right now. ${FALLBACK_HINT}`;
        throw new Error(message);
      }
      const data = (await res.json()) as { token: string; model: string };
      const { GoogleGenAI, EndSensitivity, Modality, StartSensitivity } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: data.token });
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const session = await ai.live.connect({
        model: data.model,
        config: {
          responseModalities: [Modality.AUDIO],
          sessionResumption: {},
          systemInstruction: LIVE_INTAKE_SYSTEM,
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: LIVE_VOICE } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          /*
           * Turn taking, tuned for a citizen describing a problem rather than
           * for quick back-and-forth. LOW end-of-speech sensitivity plus a
           * long silence window means a pause for thought is not read as the
           * end of the turn — the behaviour that had the agent answering half
           * a sentence in and then losing the thread.
           */
          realtimeInputConfig: {
            automaticActivityDetection: {
              startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_HIGH,
              endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_LOW,
              prefixPaddingMs: VAD_PREFIX_PADDING_MS,
              silenceDurationMs: VAD_SILENCE_MS,
            },
          },
          tools: [{ functionDeclarations: [submitIntakeDeclaration] }],
        },
        callbacks: {
          onopen: () => undefined,
          onmessage: (raw: unknown) => {
            const m = raw as LiveMessage;
            if (!sessionRef.current) {
              pendingRef.current.push(m);
              return;
            }
            handleMessage(m);
          },
          onerror: (event: unknown) => {
            if (closingRef.current || statusRef.current === "wrapup") return;
            const message = (event as { message?: string } | null)?.message;
            fail(new Error(message || "Voice connection error."));
          },
          onclose: () => {
            teardownAudio();
            clearTimers();
            sessionRef.current = null;
            if (statusRef.current === "connecting") {
              setPhase("failed");
              setError(`Voice connection closed before it started. ${FALLBACK_HINT}`);
              return;
            }
            if (statusRef.current === "failed") return;
            // Same rule as stop(): a confirmed intake still advances even if
            // the socket died before the model called the tool.
            if (!handoffRef.current && pendingProceedRef.current && hasEnoughForHandoff(userTextRef.current)) {
              publishHandoff(synthesizeHandoff(userTextRef.current, jurisdictionRef.current ?? undefined));
            }
            if (handoffRef.current) {
              setPhase("done");
              return;
            }
            setPhase("ended");
            if (!userTextRef.current) {
              setError(`The voice session closed without speech. ${FALLBACK_HINT}`);
            }
          },
        },
      });
      sessionRef.current = session;
      // Setup guard: if the server never completes setup, fail cleanly.
      softTimerRef.current = setTimeout(() => {
        if (statusRef.current === "connecting") {
          fail(new Error(`Voice session did not start. ${FALLBACK_HINT}`));
        }
      }, 15_000);
      const pending = pendingRef.current;
      pendingRef.current = [];
      for (const m of pending) handleMessage(m);
    } catch (err) {
      fail(err instanceof Error ? err : new Error("Could not start the voice session."));
    }
  }, [clearTimers, fail, handleMessage, publishHandoff, setPhase, teardownAudio]);

  const stop = useCallback(() => {
    clearTimers();
    closingRef.current = true;
    // A confirmation the model never acted on must not be lost because the
    // session closed first — the citizen already said to proceed.
    if (!handoffRef.current && pendingProceedRef.current && hasEnoughForHandoff(userTextRef.current)) {
      publishHandoff(synthesizeHandoff(userTextRef.current, jurisdictionRef.current ?? undefined));
    }
    try {
      sessionRef.current?.close();
    } catch {
      /* noop */
    }
    sessionRef.current = null;
    teardownAudio();
    const s = statusRef.current;
    if (s === "idle" || s === "done" || s === "ended" || s === "failed") return;
    if (handoffRef.current) {
      setPhase("done");
      return;
    }
    setPhase("ended");
    if (!userTextRef.current) {
      setError(`Voice session ended without speech. ${FALLBACK_HINT}`);
    }
  }, [clearTimers, publishHandoff, setPhase, teardownAudio]);

  const reset = useCallback(() => {
    stop();
    userTextRef.current = "";
    agentTextRef.current = "";
    handoffRef.current = null;
    jurisdictionRef.current = null;
    // The working memory dies with the request it belonged to.
    memoryRef.current = createSessionMemory();
    flaggedRef.current = false;
    briefedAtRef.current = 0;
    pendingProceedRef.current = false;
    setProceeding(false);
    proceedConsumedRef.current = 0;
    proceedNudgesRef.current = 0;
    identityConsumedRef.current = 0;
    offTopicConsumedRef.current = 0;
    clearIntakeRecord();
    setUserText("");
    setAgentText("");
    setHandoff(null);
    setJurisdiction(null);
    setError(null);
    setPhase("idle");
  }, [setPhase, stop]);

  useEffect(
    () => () => {
      closingRef.current = true;
      clearTimers();
      try {
        sessionRef.current?.close();
      } catch {
        /* noop */
      }
      sessionRef.current = null;
      queueRef.current?.dispose();
      try {
        nodeRef.current?.disconnect();
      } catch {
        /* noop */
      }
      for (const ref of [inCtxRef, outCtxRef]) {
        const ctx = ref.current;
        if (ctx) void ctx.close().catch(() => undefined);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [clearTimers]
  );

  return {
    status,
    supported,
    agentText,
    userText,
    error,
    handoff,
    jurisdiction,
    start,
    stop,
    reset,
    finish,
    /** True once enough has been said for the citizen to end the intake themselves. */
    canFinish: hasEnoughForHandoff(userText) && !handoff,
    /** True from the moment "proceed" is heard until the handoff lands. */
    proceeding: proceeding && !handoff,
  };
}

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
import {
  LIVE_VOICE,
  INPUT_MIME,
  SESSION_HARD_CLOSE_MS,
  SESSION_SOFT_WRAP_MS,
  WORKLET_PATH,
} from "@/lib/live/constants";

/* ============================================================
   Gemini Live intake hook. One conversational session that
   detects the citizen's language, takes their complaint, and
   ends with the submit_intake handoff. Every failure path
   keeps the captured text so the citizen can continue typing.
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

const GREETING_NUDGE =
  "(Session start. Greet the citizen directly in one short sentence asking what issue they need to file a complaint on or what information and records they want to ask from the government. Do not give open-ended chatbot pleasantries. Then stop and listen.)";

const WRAP_NUDGE =
  "(Time is nearly up. In the citizen's language, in one short sentence, thank them and restate your one-line summary, then call submit_intake immediately in the same turn. Do not ask any more questions.)";

/** Steers the model to stop after the handoff instead of drifting back into chat. */
const HANDOFF_ACK =
  "Intake captured successfully. The session is now complete: say exactly one short goodbye line in the citizen's language and stop. Do NOT ask any further questions or offer more help.";

const FALLBACK_HINT = "Pick a language below and continue instead.";

export function useLiveIntake() {
  const [status, setStatus] = useState<LiveStatus>("idle");
  const [supported, setSupported] = useState(false);
  const [agentText, setAgentText] = useState("");
  const [userText, setUserText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<IntakeHandoff | null>(null);

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
  const pendingRef = useRef<LiveMessage[]>([]);
  const userTextRef = useRef("");
  const agentTextRef = useRef("");
  const handoffRef = useRef<IntakeHandoff | null>(null);
  const closingRef = useRef(false);

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
  }, []);

  const appendAgent = useCallback((text: string) => {
    if (!text) return;
    agentTextRef.current = `${agentTextRef.current} ${text}`.replace(/\s+/g, " ").trim();
    setAgentText(agentTextRef.current);
  }, []);

  const clearTimers = useCallback(() => {
    for (const ref of [softTimerRef, hardTimerRef, closeTimerRef]) {
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
      if (msg.goAway && statusRef.current === "active") wrapUp();
      const calls = msg.toolCall?.functionCalls;
      if (calls) {
        for (const call of calls) {
          if (call.name !== "submit_intake") continue;
          const normalized = normalizeHandoff(call.args ?? {});
          handoffRef.current = normalized;
          setHandoff(normalized);
          // Persist the intake so a refresh mid-flow never loses the complaint.
          saveIntakeRecord({
            handoff: normalized,
            transcript: userTextRef.current.trim(),
            capturedAt: Date.now(),
          });
          try {
            sessionRef.current?.sendToolResponse({
              functionResponses: [{ id: call.id, name: call.name, response: { ok: true, instruction: HANDOFF_ACK } }],
            });
          } catch {
            /* session may be closing */
          }
          if (statusRef.current === "active") setPhase("wrapup");
          closeTimerRef.current = setTimeout(() => {
            closingRef.current = true;
            try {
              sessionRef.current?.close();
            } catch {
              /* noop */
            }
          }, 2500);
        }
      }
    },
    [appendAgent, appendUser, beginAudio, setPhase, wrapUp]
  );

  const start = useCallback(async () => {
    const current = statusRef.current;
    if (current === "connecting" || current === "active" || current === "wrapup") return;
    closingRef.current = false;
    pendingRef.current = [];
    userTextRef.current = "";
    agentTextRef.current = "";
    handoffRef.current = null;
    clearIntakeRecord();
    setUserText("");
    setAgentText("");
    setHandoff(null);
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
      const { GoogleGenAI, Modality } = await import("@google/genai");
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
  }, [clearTimers, fail, handleMessage, setPhase, teardownAudio]);

  const stop = useCallback(() => {
    clearTimers();
    closingRef.current = true;
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
  }, [clearTimers, setPhase, teardownAudio]);

  const reset = useCallback(() => {
    stop();
    userTextRef.current = "";
    agentTextRef.current = "";
    handoffRef.current = null;
    clearIntakeRecord();
    setUserText("");
    setAgentText("");
    setHandoff(null);
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

  return { status, supported, agentText, userText, error, handoff, start, stop, reset };
}

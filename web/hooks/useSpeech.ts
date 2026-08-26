"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/* Web Speech API wrapper — continuous recognition with interim results.
   Chrome/Edge/Android have solid support; Safari partial; Firefox none.
   The hook always reports `supported` so the UI can fall back to typing. */

export type SpeechStatus = "idle" | "listening" | "error" | "unsupported";

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [i: number]: {
      isFinal: boolean;
      length: number;
      [j: number]: { transcript: string };
    };
  };
}

type RecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeech(lang: string) {
  const [status, setStatus] = useState<SpeechStatus>("idle");
  // Starts false on server AND first client paint (hydration-safe), then
  // flips after mount when we can actually probe for SpeechRecognition.
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(getRecognitionCtor() !== null);
  }, []);
  const [finalText, setFinalTextState] = useState("");
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const shouldListenRef = useRef(false);
  const finalTextRef = useRef("");

  const setFinalText = useCallback((update: string | ((prev: string) => string)) => {
    const next = typeof update === "function" ? update(finalTextRef.current) : update;
    finalTextRef.current = next;
    setFinalTextState(next);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setStatus("unsupported");
      return;
    }
    if (recRef.current) {
      try { recRef.current.abort(); } catch { /* noop */ }
      recRef.current = null;
    }
    setError(null);
    setInterimText("");
    shouldListenRef.current = true;

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const text = res[0]?.transcript ?? "";
        if (res.isFinal) {
          const chunk = text.trim();
          if (chunk) {
            setFinalText((prev) => (prev ? `${prev} ${chunk}` : chunk));
          }
        } else {
          interim += text;
        }
      }
      setInterimText(interim);
    };

    rec.onerror = (e) => {
      if (e.error === "no-speech") return; // keep listening
      shouldListenRef.current = false;
      const map: Record<string, string> = {
        "not-allowed": "Microphone permission denied. You can type instead.",
        "service-not-allowed": "Speech service blocked by the browser. You can type instead.",
        network: "Speech network error. Check the connection or type instead.",
        "audio-capture": "No microphone found. You can type instead.",
      };
      setError(map[e.error] ?? `Speech error: ${e.error}. You can type instead.`);
      setStatus("error");
      try { rec.abort(); } catch { /* noop */ }
    };

    rec.onend = () => {
      // Chrome stops after silence; restart while the citizen intends to keep talking.
      if (shouldListenRef.current) {
        try { rec.start(); } catch { /* start races are harmless */ }
        return;
      }
      setStatus((s) => (s === "listening" ? "idle" : s));
    };

    recRef.current = rec;
    try {
      rec.start();
      setStatus("listening");
    } catch {
      setStatus("error");
      setError("Could not start the microphone. You can type instead.");
    }
  }, [lang, setFinalText]);

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    try { recRef.current?.stop(); } catch { /* noop */ }
    setStatus((s) => (s === "listening" ? "idle" : s));
  }, []);

  const reset = useCallback(() => {
    setFinalText("");
    setInterimText("");
    setError(null);
    setStatus(supported ? "idle" : "unsupported");
  }, [supported, setFinalText]);

  return { status, finalText, interimText, error, supported, start, stop, reset, setFinalText };
}

/* ============================================================
   Live voice intake constants (Gemini Live API). Shared by the
   token route (server) and the intake hook (client). No secrets
   in this file.
   ============================================================ */

export const LIVE_MODEL_DEFAULT = "gemini-3.1-flash-live-preview";

/** Server-side only: the model slug minted into the ephemeral token. */
export function liveModel(): string {
  return process.env.GEMINI_LIVE_MODEL?.trim() || LIVE_MODEL_DEFAULT;
}

/** Ephemeral tokens only work against the v1beta Gemini API. */
export const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
export const EPHEMERAL_TOKEN_TTL_MS = 10 * 60_000;

export const INPUT_RATE = 16000;
export const OUTPUT_RATE = 24000;
export const INPUT_MIME = "audio/pcm;rate=16000";
export const WORKLET_PATH = "/live/pcm-resampler.js";

/** Soft wrap nudge, then a hard close (server cap for audio sessions is 15 min). */
export const SESSION_SOFT_WRAP_MS = 4 * 60_000;
export const SESSION_HARD_CLOSE_MS = 5 * 60_000;

/* ---------- turn taking ----------

   A citizen describing a civic problem pauses to think, and the
   default end-of-speech detection treated those pauses as the end
   of their turn — so the agent answered half a sentence in, and
   the citizen's remaining words landed as a fresh turn the agent
   then had to reconcile. The result read as the agent interrupting
   and then losing the thread.

   Both knobs push the same way: wait longer before deciding the
   citizen has finished.                                          */

/**
 * Silence the Live API requires before it commits end-of-speech.
 * Well above the ~500 ms default: a pause for thought is not the
 * end of a turn.
 */
export const VAD_SILENCE_MS = 1200;

/**
 * Speech required before start-of-speech is committed. Long enough
 * that a cough or a doorbell does not cut the agent off mid-answer.
 */
export const VAD_PREFIX_PADDING_MS = 320;

/**
 * How long the citizen must have been quiet before the app injects
 * one of its own system notes. The turn boundary alone is not
 * enough — transcription lags the audio, so a boundary can arrive
 * while the citizen is still talking.
 */
export const TURN_SILENCE_MS = 700;

/**
 * Re-ground the model with the memory briefing at most this often.
 * Frequent enough to stop it drifting, rare enough that it is not
 * reading a note before every sentence.
 */
export const BRIEFING_INTERVAL_MS = 25_000;

export const SUPPORTED_LANG_CODES = [
  "en-IN",
  "hi-IN",
  "ta-IN",
  "te-IN",
  "bn-IN",
  "mr-IN",
  "gu-IN",
  "kn-IN",
  "ml-IN",
  "pa-IN",
  "or-IN",
  "ur-IN",
] as const;

/** Prebuilt assistant voice; override with NEXT_PUBLIC_GEMINI_LIVE_VOICE. */
export const LIVE_VOICE = process.env.NEXT_PUBLIC_GEMINI_LIVE_VOICE?.trim() || "Kore";

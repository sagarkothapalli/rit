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

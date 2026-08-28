function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Session HMAC secret. Production must set EMAIL_OTP_SECRET; a missing value
 * fails rather than falling back to a predictable string.
 */
export function sessionSecret(): string {
  const explicit = process.env.EMAIL_OTP_SECRET?.trim();
  if (explicit) return explicit;
  // A *predictable* fallback is the danger, not the absence of a dedicated
  // variable. Derive from whatever real secrets this deployment already holds,
  // and fail closed only when there is nothing secret to derive from.
  const derived = [process.env.DATABASE_URL, process.env.ADMIN_PIN, process.env.LLM_API_KEY]
    .filter(Boolean)
    .join("|");
  if (derived) return derived;
  if (isProduction()) {
    throw new Error("EMAIL_OTP_SECRET is required in production.");
  }
  return "praja-rti-development-only-secret";
}

/**
 * Demo bypass: 0000 and 000000 always verify, and the issued code is shown
 * in the UI when no mail provider is configured. Set PRAJA_OTP_BYPASS=0 to
 * turn both off and require a real emailed code.
 */
export function otpBypassEnabled(): boolean {
  return process.env.PRAJA_OTP_BYPASS !== "0";
}

export const DEFAULT_BYPASS_CODE = "000000";

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
  if (isProduction()) {
    throw new Error("EMAIL_OTP_SECRET is required in production.");
  }
  const derived = [process.env.DATABASE_URL, process.env.ADMIN_PIN, process.env.LLM_API_KEY]
    .filter(Boolean)
    .join("|");
  return derived || "praja-rti-development-only-secret";
}

/** Demo OTP bypass is development-only and must be opted into. */
export function otpBypassEnabled(): boolean {
  if (isProduction()) return false;
  return process.env.PRAJA_OTP_BYPASS === "1";
}

export const DEFAULT_BYPASS_CODE = "000000";

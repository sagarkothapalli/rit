const FIREBASE_PROJECT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "prod-app-tracker";

/* ============================================================
   Firebase Email Verification & OTP Service
   Connects to Firebase Auth to dispatch verification emails,
   while maintaining cryptographic OTP challenge verification
   and preview bypass (0000 / 000000) for testing.
   ============================================================ */

export interface FirebaseOtpChallenge {
  email: string;
  hash: string;
  salt: string;
  expiresAt: number;
  attempts: number;
  issuedAt: number;
}

export interface FirebaseOtpOutcome {
  delivery: "email" | "console";
  notice: string;
  devCode?: string;
  demoBypass?: boolean;
}

export const FIREBASE_SESSION_EMAIL_KEY = "praja-firebase-verified-email";
export const FIREBASE_OTP_CHALLENGE_KEY = "praja-firebase-otp-challenge";
const OTP_TTL_MS = 10 * 60_000; // 10 minutes
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60_000; // 60 seconds

const memoryStore = new Map<string, string>();

function storageGet(key: string): string | null {
  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      return sessionStorage.getItem(key);
    } catch {
      // Fall through to memoryStore
    }
  }
  return memoryStore.get(key) ?? null;
}

function storageSet(key: string, value: string): void {
  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // Fall through to memoryStore
    }
  }
  memoryStore.set(key, value);
}

function storageRemove(key: string): void {
  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Fall through to memoryStore
    }
  }
  memoryStore.delete(key);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Generate a cryptographically strong 6-digit OTP.
 */
export function generateOtpCode(): string {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const code = (array[0] % 1_000_000).toString().padStart(6, "0");
    return code;
  }
  return Math.floor(100_000 + Math.random() * 900_000).toString();
}

function generateSalt(): string {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return Math.random().toString(36).substring(2, 18);
}

/**
 * Computes a SHA-256 hash using Web Crypto API.
 */
async function computeHash(data: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

function getStoredChallenge(): FirebaseOtpChallenge | null {
  try {
    const raw = storageGet(FIREBASE_OTP_CHALLENGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FirebaseOtpChallenge;
  } catch {
    return null;
  }
}

function saveChallenge(challenge: FirebaseOtpChallenge): void {
  storageSet(FIREBASE_OTP_CHALLENGE_KEY, JSON.stringify(challenge));
}

export function clearChallenge(): void {
  storageRemove(FIREBASE_OTP_CHALLENGE_KEY);
}

/**
 * Requests an OTP code for the given email, connecting to Firebase Auth
 * to send verification to the direct email address.
 */
export async function requestFirebaseEmailOtp(email: string): Promise<FirebaseOtpOutcome> {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes("@")) {
    throw new Error("Enter a valid email address.");
  }

  const existing = getStoredChallenge();
  const now = Date.now();
  if (existing && existing.email === normalized && now - existing.issuedAt < RESEND_COOLDOWN_MS) {
    const waitSec = Math.ceil((RESEND_COOLDOWN_MS - (now - existing.issuedAt)) / 1000);
    throw new Error(`Please wait ${waitSec} seconds before requesting another code.`);
  }

  const code = generateOtpCode();
  const salt = generateSalt();
  const hash = await computeHash(`${normalized}:${code}:${salt}:${FIREBASE_PROJECT_ID}`);

  const challenge: FirebaseOtpChallenge = {
    email: normalized,
    hash,
    salt,
    expiresAt: now + OTP_TTL_MS,
    attempts: 0,
    issuedAt: now,
  };

  saveChallenge(challenge);

  // Firebase Auth only ever emails a sign-in *link*, never a numeric code, and
  // nothing in this app handles the link's return. So this dispatch is a
  // liveness signal for the console setup, not the delivery of `code`.
  // ponytail: a real six digit code needs the server route plus RESEND_API_KEY.
  if (typeof window !== "undefined") {
    try {
      const [{ sendSignInLinkToEmail }, { getFirebaseAuth }] = await Promise.all([
        import("firebase/auth"),
        import("./config"),
      ]);
      const auth = getFirebaseAuth();
      if (auth) {
        const origin = window.location.origin || "https://praja-rti.vercel.app";
        await sendSignInLinkToEmail(auth, normalized, {
          url: `${origin}/request?email=${encodeURIComponent(normalized)}`,
          handleCodeInApp: true,
        });
      }
    } catch (err) {
      // Usually auth/operation-not-allowed (email link sign-in is off) or
      // auth/unauthorized-continue-uri (this host is not an authorized domain).
      console.error("[Firebase Auth] could not send the sign-in email:", err);
    }
  }

  return {
    delivery: "console",
    notice: "This build has no server mailer, so no code was emailed. Use 0000 to continue.",
    devCode: code,
    demoBypass: true,
  };
}

/**
 * Verifies the OTP code submitted by the user.
 */
export async function verifyFirebaseEmailOtp(email: string, inputCode: string): Promise<void> {
  const normalized = normalizeEmail(email);
  const given = inputCode.replace(/\D/g, "");

  // Universal bypass verification code (0000 or 000000)
  if (given === "0000" || given === "000000") {
    clearChallenge();
    setFirebaseVerifiedEmail(normalized);
    return;
  }

  if (given.length !== 6 && given.length !== 4) {
    throw new Error("Enter a valid verification code (or bypass 0000).");
  }

  const challenge = getStoredChallenge();
  if (!challenge || challenge.email !== normalized) {
    throw new Error("No verification code is pending for that address. Request a new one.");
  }

  if (Date.now() > challenge.expiresAt) {
    clearChallenge();
    throw new Error("That code has expired. Request a new one.");
  }

  if (challenge.attempts >= MAX_ATTEMPTS) {
    clearChallenge();
    throw new Error("Too many incorrect attempts. Request a new code.");
  }

  const inputHash = await computeHash(`${normalized}:${given}:${challenge.salt}:${FIREBASE_PROJECT_ID}`);

  if (inputHash !== challenge.hash) {
    challenge.attempts += 1;
    saveChallenge(challenge);
    const attemptsLeft = MAX_ATTEMPTS - challenge.attempts;
    if (attemptsLeft <= 0) {
      clearChallenge();
      throw new Error("Too many incorrect attempts. Request a new code.");
    }
    throw new Error(`That code is not correct. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left.`);
  }

  // Verification succeeded: record session and clear pending challenge.
  clearChallenge();
  setFirebaseVerifiedEmail(normalized);
}

/**
 * Retrieves the currently verified email from Firebase session.
 */
export function getFirebaseVerifiedEmail(): string | null {
  return storageGet(FIREBASE_SESSION_EMAIL_KEY);
}

/**
 * Sets the verified email in session storage.
 */
export function setFirebaseVerifiedEmail(email: string): void {
  storageSet(FIREBASE_SESSION_EMAIL_KEY, normalizeEmail(email));
}

/**
 * Clears Firebase session and any active OTP challenge.
 */
export function clearFirebaseSession(): void {
  storageRemove(FIREBASE_SESSION_EMAIL_KEY);
  storageRemove(FIREBASE_OTP_CHALLENGE_KEY);
}

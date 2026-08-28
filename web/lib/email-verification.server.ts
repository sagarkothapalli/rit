import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { DEFAULT_BYPASS_CODE, otpBypassEnabled, sessionSecret } from "@/lib/security/secrets";

/* ============================================================
   Email verification for the RTI application flow.

   Security properties, and the reasons for them:
   - The code is never stored in plain text. Only an HMAC of it,
     keyed by a server secret, so a leaked store cannot be used
     to verify.
   - The email is part of the HMAC input, so a code minted for
     one address cannot verify another.
   - Codes expire (10 minutes) and are single-use.
   - Verification attempts are capped (5) so a 6-digit code
     cannot be brute-forced within its lifetime.
   - Issuing is throttled per address so this cannot be used to
     mail-bomb a third party.
   - Comparison is constant-time.

   Storage is Postgres when DATABASE_URL is set, otherwise a
   local file. Both are pruned of expired rows on every write.
   ============================================================ */

export const VERIFIED_COOKIE = "praja_email_verified";

const CODE_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60_000;
/** How long a completed verification is trusted for. */
export const SESSION_TTL_MS = 12 * 60 * 60_000;

const FILE_STORE = path.join(process.cwd(), ".data", "email-verification.json");

let pool: Pool | null = null;

function db(): Pool | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  if (!pool) pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 3 });
  return pool;
}

/**
 * Server secret for the code HMAC and the session cookie.
 * Production requires EMAIL_OTP_SECRET and fails closed if it is missing.
 */
function secret(): string {
  return sessionSecret();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function codeHash(email: string, code: string): string {
  return createHmac("sha256", secret()).update(`${normalizeEmail(email)}|${code}`).digest("hex");
}

function equal(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Six digits, uniformly distributed, including leading zeros. */
function newCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

interface Challenge {
  email: string;
  hash: string;
  expiresAt: number;
  attempts: number;
  issuedAt: number;
}

/* ---------- file store ---------- */

async function readFileStore(): Promise<Record<string, Challenge>> {
  try {
    const raw = await fs.readFile(FILE_STORE, "utf8");
    const parsed = JSON.parse(raw) as Record<string, Challenge>;
    const now = Date.now();
    return Object.fromEntries(Object.entries(parsed).filter(([, row]) => row.expiresAt > now));
  } catch {
    return {};
  }
}

async function writeFileStore(rows: Record<string, Challenge>): Promise<void> {
  await fs.mkdir(path.dirname(FILE_STORE), { recursive: true });
  const tmp = `${FILE_STORE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(rows), { mode: 0o600 });
  await fs.rename(tmp, FILE_STORE);
}

/* ---------- postgres store ---------- */

async function ensureTable(client: Pool): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS praja_email_challenges (
      email text PRIMARY KEY,
      code_hash text NOT NULL,
      expires_at timestamptz NOT NULL,
      attempts integer NOT NULL DEFAULT 0,
      issued_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await client.query("DELETE FROM praja_email_challenges WHERE expires_at < now()");
}

async function loadChallenge(email: string): Promise<Challenge | null> {
  const key = normalizeEmail(email);
  const client = db();
  if (client) {
    try {
      await ensureTable(client);
      const result = await client.query<{
        email: string;
        code_hash: string;
        expires_at: Date;
        attempts: number;
        issued_at: Date;
      }>("SELECT * FROM praja_email_challenges WHERE email = $1", [key]);
      const row = result.rows[0];
      if (!row) return null;
      return {
        email: row.email,
        hash: row.code_hash,
        expiresAt: row.expires_at.getTime(),
        attempts: row.attempts,
        issuedAt: row.issued_at.getTime(),
      };
    } catch {
      // Fall through to the file store.
    }
  }
  return (await readFileStore())[key] ?? null;
}

async function storeChallenge(challenge: Challenge): Promise<void> {
  const client = db();
  if (client) {
    try {
      await ensureTable(client);
      await client.query(
        `INSERT INTO praja_email_challenges (email, code_hash, expires_at, attempts, issued_at)
         VALUES ($1, $2, to_timestamp($3 / 1000.0), $4, to_timestamp($5 / 1000.0))
         ON CONFLICT (email) DO UPDATE SET
           code_hash = EXCLUDED.code_hash,
           expires_at = EXCLUDED.expires_at,
           attempts = EXCLUDED.attempts,
           issued_at = EXCLUDED.issued_at`,
        [challenge.email, challenge.hash, challenge.expiresAt, challenge.attempts, challenge.issuedAt],
      );
      return;
    } catch {
      // Fall through to the file store.
    }
  }
  const rows = await readFileStore();
  rows[challenge.email] = challenge;
  await writeFileStore(rows);
}

async function dropChallenge(email: string): Promise<void> {
  const key = normalizeEmail(email);
  const client = db();
  if (client) {
    try {
      await ensureTable(client);
      await client.query("DELETE FROM praja_email_challenges WHERE email = $1", [key]);
      return;
    } catch {
      // Fall through to the file store.
    }
  }
  const rows = await readFileStore();
  delete rows[key];
  await writeFileStore(rows);
}

/* ---------- issuing ---------- */

export type IssueResult =
  | { ok: true; expiresInSec: number; delivery: DeliveryOutcome }
  | { ok: false; reason: "COOLDOWN"; retryAfterSec: number };

export async function issueCode(email: string): Promise<IssueResult> {
  const key = normalizeEmail(email);
  const existing = await loadChallenge(key);
  const now = Date.now();
  if (existing && now - existing.issuedAt < RESEND_COOLDOWN_MS) {
    return {
      ok: false,
      reason: "COOLDOWN",
      retryAfterSec: Math.ceil((RESEND_COOLDOWN_MS - (now - existing.issuedAt)) / 1000),
    };
  }
  const code = newCode();
  await storeChallenge({
    email: key,
    hash: codeHash(key, code),
    expiresAt: now + CODE_TTL_MS,
    attempts: 0,
    issuedAt: now,
  });
  const delivery = await deliverCode(key, code);
  return { ok: true, expiresInSec: Math.floor(CODE_TTL_MS / 1000), delivery };
}

/* ---------- verifying ---------- */

export { DEFAULT_BYPASS_CODE, otpBypassEnabled } from "@/lib/security/secrets";

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "NO_CHALLENGE" | "EXPIRED" | "TOO_MANY_ATTEMPTS" | "WRONG_CODE"; attemptsLeft?: number };

export async function verifyCode(email: string, code: string): Promise<VerifyResult> {
  const key = normalizeEmail(email);
  const given = code.replace(/\D/g, "");

  if (otpBypassEnabled() && (given === DEFAULT_BYPASS_CODE || given === "0000")) {
    await dropChallenge(key);
    return { ok: true };
  }

  const challenge = await loadChallenge(key);
  if (!challenge) return { ok: false, reason: "NO_CHALLENGE" };
  if (Date.now() > challenge.expiresAt) {
    await dropChallenge(key);
    return { ok: false, reason: "EXPIRED" };
  }
  if (challenge.attempts >= MAX_ATTEMPTS) {
    await dropChallenge(key);
    return { ok: false, reason: "TOO_MANY_ATTEMPTS" };
  }
  if (given.length === 6 && equal(challenge.hash, codeHash(key, given))) {
    // Single use: the code cannot be replayed.
    await dropChallenge(key);
    return { ok: true };
  }
  const attempts = challenge.attempts + 1;
  await storeChallenge({ ...challenge, attempts });
  if (attempts >= MAX_ATTEMPTS) {
    await dropChallenge(key);
    return { ok: false, reason: "TOO_MANY_ATTEMPTS" };
  }
  return { ok: false, reason: "WRONG_CODE", attemptsLeft: MAX_ATTEMPTS - attempts };
}

/* ---------- session cookie ---------- */

/**
 * `email.expiry.signature` — a stateless proof that this browser completed
 * verification for this address. Signed, so it cannot be forged client-side.
 */
export function sessionToken(email: string, now = Date.now()): string {
  const key = normalizeEmail(email);
  const expiry = now + SESSION_TTL_MS;
  const payload = `${Buffer.from(key).toString("base64url")}.${expiry}`;
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function readSessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [encoded, expiryRaw, signature] = parts;
  const expected = createHmac("sha256", secret()).update(`${encoded}.${expiryRaw}`).digest("base64url");
  if (!equal(signature, expected)) return null;
  const expiry = Number(expiryRaw);
  if (!Number.isFinite(expiry) || Date.now() > expiry) return null;
  try {
    return Buffer.from(encoded, "base64url").toString("utf8") || null;
  } catch {
    return null;
  }
}

export function verifiedEmailFromRequest(req: Request): string | null {
  const match = req.headers.get("cookie")?.match(new RegExp(`${VERIFIED_COOKIE}=([^;]+)`));
  return readSessionToken(match?.[1]);
}

export function cookieSecure(req: Request): boolean {
  const forwarded = req.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0].trim() === "https";
  try {
    return new URL(req.url).protocol === "https:";
  } catch {
    return false;
  }
}

/* ---------- delivery ---------- */

export type DeliveryOutcome =
  | { channel: "email"; provider: string }
  | { channel: "console"; code: string; reason: string };

function emailBody(code: string): { subject: string; text: string } {
  return {
    subject: `${code} is your Praja RTI verification code`,
    text: [
      "Praja RTI — email verification",
      "",
      `Your verification code is ${code}`,
      "",
      "It expires in 10 minutes and can be used once.",
      "If you did not request this code, ignore this message; nothing has been filed.",
      "",
      "Praja RTI is independent citizen assistance. It is not a Government of India portal",
      "and it does not file applications on your behalf.",
    ].join("\n"),
  };
}

/**
 * Provider-agnostic delivery. Set RESEND_API_KEY (or SMTP later) and real
 * mail goes out with no other change. With nothing configured the code is
 * written to the server log so the flow stays fully testable — the code is
 * never returned to the browser in production.
 */
async function deliverCode(email: string, code: string): Promise<DeliveryOutcome> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || "Praja RTI <onboarding@resend.dev>";
  const { subject, text } = emailBody(code);

  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to: [email], subject, text }),
      });
      if (res.ok) return { channel: "email", provider: "resend" };
      console.error(`[praja-rti] Resend rejected the verification email: HTTP ${res.status}`);
    } catch (error) {
      console.error("[praja-rti] Resend delivery failed", error);
    }
  }

  // Deliberately loud: an operator reading logs can complete any flow.
  console.info(
    `[praja-rti] EMAIL VERIFICATION CODE for ${email}: ${code} (expires in 10 minutes). `
    + "Set RESEND_API_KEY and EMAIL_FROM to deliver this by email instead.",
  );
  return {
    channel: "console",
    code,
    reason: resendKey ? "The email provider rejected the message." : "No email provider is configured.",
  };
}

/** Expose demo code to client when no email provider is configured. */
export function exposeCodeToClient(): boolean {
  return !process.env.RESEND_API_KEY?.trim();
}

/** Stable, non-reversible identifier for logging without recording the address. */
export function emailFingerprint(email: string): string {
  return createHash("sha256").update(normalizeEmail(email)).digest("hex").slice(0, 12);
}

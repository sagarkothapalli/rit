import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE = "praja_admin";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function configuredPin(): string {
  return (process.env.ADMIN_PIN || "").trim().replace(/^["']|["']$/g, "");
}

function normalizePin(pin: string): string {
  return pin.trim().replace(/\s+/g, "");
}

/* Key the session cookie is signed with. Set ADMIN_SESSION_SECRET in
   production: without it the cookie is signed with the PIN itself, and anyone
   who gets hold of a cookie can brute-force the PIN back out of it offline.
   ponytail: one key, no rotation window. Rotating the value logs everyone out,
   which is also how you revoke a leaked cookie. */
function signingKey(): string {
  return (process.env.ADMIN_SESSION_SECRET || "").trim() || configuredPin();
}

function sign(payload: string): string {
  return createHmac("sha256", signingKey()).update(payload).digest("hex");
}

export function verifyPin(pin: string): boolean {
  const expected = configuredPin();
  const given = normalizePin(pin);
  if (!expected || !given) return false;
  // Hash both sides first so the compare is fixed-width and can't leak the
  // configured PIN's length by returning early.
  return timingSafeEqual(
    createHash("sha256").update(given).digest(),
    createHash("sha256").update(expected).digest()
  );
}

/** `<expiresAt>.<nonce>.<hmac>` — unguessable, expires on the server, and
    invalidated wholesale by changing ADMIN_SESSION_SECRET. */
export function mintSession(): string | null {
  if (!configuredPin()) return null;
  const payload = `${Date.now() + SESSION_TTL_MS}.${randomBytes(9).toString("hex")}`;
  return `${payload}.${sign(payload)}`;
}

export function cookieOk(value: string | undefined): boolean {
  if (!value || !configuredPin()) return false;
  const cut = value.lastIndexOf(".");
  if (cut < 1) return false;
  const payload = value.slice(0, cut);
  const given = Buffer.from(value.slice(cut + 1), "hex");
  const want = Buffer.from(sign(payload), "hex");
  if (given.length !== want.length || !timingSafeEqual(given, want)) return false;
  const expiresAt = Number(payload.split(".")[0]);
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}

export function authedReq(req: Request): boolean {
  const m = req.headers.get("cookie")?.match(new RegExp(`${ADMIN_COOKIE}=([^;]+)`));
  return cookieOk(m?.[1]);
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

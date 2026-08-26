import { createHash, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE = "praja_admin";

function configuredPin(): string {
  return (process.env.ADMIN_PIN || "").trim().replace(/^["']|["']$/g, "");
}

function normalizePin(pin: string): string {
  return pin.trim().replace(/\s+/g, "");
}

function pinHash(): string {
  const pin = configuredPin();
  if (!pin) return "";
  return createHash("sha256").update(`${pin}|praja-admin-v1`).digest("hex");
}

export function verifyPin(pin: string): boolean {
  const expected = configuredPin();
  const given = normalizePin(pin);
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function cookieOk(value: string | undefined): boolean {
  if (!value) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(pinHash());
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function authedReq(req: Request): boolean {
  const m = req.headers.get("cookie")?.match(new RegExp(`${ADMIN_COOKIE}=([^;]+)`));
  return cookieOk(m?.[1]);
}

export function sessionCookieValue(): string {
  return pinHash();
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

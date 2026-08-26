import { createHash, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE = "praja_admin";

function pinHash(): string {
  const pin = process.env.ADMIN_PIN || "123456";
  return createHash("sha256").update(`${pin}|praja-admin-v1`).digest("hex");
}

export function verifyPin(pin: string): boolean {
  const expected = process.env.ADMIN_PIN || "123456";
  const a = Buffer.from(pin);
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

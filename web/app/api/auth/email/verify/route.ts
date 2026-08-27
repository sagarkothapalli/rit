import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, rateLimit } from "@/lib/cage/ratelimit";
import {
  cookieSecure,
  normalizeEmail,
  sessionToken,
  SESSION_TTL_MS,
  VERIFIED_COOKIE,
  verifyCode,
} from "@/lib/email-verification.server";

export const dynamic = "force-dynamic";

const Body = z.object({
  email: z.string().email().max(254),
  code: z.string().regex(/^\d{6}$/),
});

const MESSAGES: Record<string, string> = {
  NO_CHALLENGE: "No code is pending for that address. Request a new one.",
  EXPIRED: "That code has expired. Request a new one.",
  TOO_MANY_ATTEMPTS: "Too many incorrect attempts. Request a new code.",
  WRONG_CODE: "That code is not correct.",
};

/**
 * Verifies a code and, on success, sets a signed httpOnly cookie proving this
 * browser owns the address. Attempt caps live in the store, so they survive
 * a client that clears its own state.
 */
export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "otp-verify"), 20, 10 * 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "RATE_LIMITED", retryAfter: rl.retryAfter }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const email = normalizeEmail(parsed.data.email);
  const result = await verifyCode(email, parsed.data.code);
  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.reason,
        message: MESSAGES[result.reason],
        attemptsLeft: result.attemptsLeft,
      },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ ok: true, email });
  res.cookies.set(VERIFIED_COOKIE, sessionToken(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(req),
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    path: "/",
  });
  return res;
}

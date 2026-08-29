import { NextResponse } from "next/server";
import { ADMIN_COOKIE, cookieSecure, mintSession, verifyPin } from "@/lib/cage/admin";
import { clientKey, rateLimit } from "@/lib/cage/ratelimit";
import { csrfFailure } from "@/lib/security/csrf";

export const dynamic = "force-dynamic";

const WINDOW_MS = 15 * 60_000;

export async function POST(req: Request) {
  const csrf = csrfFailure(req);
  if (csrf) return csrf;

  // Per-IP first, then a deployment-wide cap so rotating addresses doesn't buy
  // an attacker an unlimited PIN guess rate.
  // ponytail: the global bucket means a flood can lock the admin out for the
  // window. That beats leaving the only real auth boundary unmetered; give the
  // PIN enough digits that 60/15min is hopeless.
  const perIp = rateLimit(clientKey(req, "admin-login"), 5, WINDOW_MS);
  if (!perIp.ok) {
    return NextResponse.json({ error: "RATE_LIMITED", retryAfter: perIp.retryAfter }, { status: 429 });
  }
  const global = rateLimit("admin-login:global", 60, WINDOW_MS);
  if (!global.ok) {
    return NextResponse.json({ error: "RATE_LIMITED", retryAfter: global.retryAfter }, { status: 429 });
  }

  let body: { pin?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }
  const pin = typeof body.pin === "string" ? body.pin : "";
  if (!verifyPin(pin)) {
    return NextResponse.json({ error: "WRONG_PIN" }, { status: 401 });
  }
  const token = mintSession();
  if (!token) {
    return NextResponse.json({ error: "PIN_NOT_CONFIGURED" }, { status: 500 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(req),
    maxAge: 60 * 60 * 8,
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/" });
  return res;
}

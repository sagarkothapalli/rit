import { NextResponse } from "next/server";
import { ADMIN_COOKIE, cookieSecure, sessionCookieValue, verifyPin } from "@/lib/cage/admin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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
  const token = sessionCookieValue();
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

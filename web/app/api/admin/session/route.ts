import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { ADMIN_COOKIE, verifyPin } from "@/lib/cage/admin";

export const dynamic = "force-dynamic";

function cookieValue(): string {
  const pin = process.env.ADMIN_PIN || "123456";
  return createHash("sha256").update(`${pin}|praja-admin-v1`).digest("hex");
}

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
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, cookieValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
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

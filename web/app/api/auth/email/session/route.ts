import { NextResponse } from "next/server";
import { VERIFIED_COOKIE, verifiedEmailFromRequest } from "@/lib/email-verification.server";

export const dynamic = "force-dynamic";

/** Who, if anyone, this browser has verified as. */
export async function GET(req: Request) {
  const email = verifiedEmailFromRequest(req);
  return NextResponse.json({ email });
}

/** Sign out of the verified session. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(VERIFIED_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/" });
  return res;
}

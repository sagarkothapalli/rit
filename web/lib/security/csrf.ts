import { NextResponse } from "next/server";

export function csrfFailure(req: Request): NextResponse | null {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return null;
  const site = req.headers.get("sec-fetch-site");
  if (site === "same-origin" || site === "none") return null;
  const host = req.headers.get("host");
  const origin = req.headers.get("origin");
  if (origin && host) {
    try {
      if (new URL(origin).host === host) return null;
    } catch {
      return NextResponse.json({ error: "CSRF" }, { status: 403 });
    }
  }
  const referer = req.headers.get("referer");
  if (referer && host) {
    try {
      if (new URL(referer).host === host) return null;
    } catch {
      return NextResponse.json({ error: "CSRF" }, { status: 403 });
    }
  }
  if (!origin && !referer) return null;
  return NextResponse.json({ error: "CSRF" }, { status: 403 });
}

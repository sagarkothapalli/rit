import { NextResponse } from "next/server";
import { csrfFailure } from "@/lib/security/csrf";

/* Minimal in-memory rate limiter (per-IP, per-route). Fine for a single-node hackathon demo.
   ponytail: in-memory, so buckets reset on cold start and are per-instance.
   Swap in Upstash/Redis behind the same key shape when one node stops being true. */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit = 30, windowMs = 60_000): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    buckets.set(key, arr);
    return { ok: false, retryAfter: Math.ceil((windowMs - (now - arr[0])) / 1000) };
  }
  arr.push(now);
  buckets.set(key, arr);
  return { ok: true, retryAfter: 0 };
}

export function clientKey(req: Request, route: string): string {
  // x-real-ip is written by the platform edge and overwritten per request.
  // In x-forwarded-for the LAST entry is the one our nearest proxy appended;
  // the first is whatever the client sent, so trusting it lets a caller mint a
  // fresh bucket per request and walk past every limit in the app.
  const real = req.headers.get("x-real-ip")?.trim();
  const chain = req.headers.get("x-forwarded-for")?.split(",") ?? [];
  const hop = chain[chain.length - 1]?.trim();
  return `${route}:${real || hop || "local"}`;
}

/** Whole-deployment hourly ceiling on model calls. A blank or malformed env
    value falls back to the default rather than to NaN, which compares false
    against everything and would quietly switch the budget off. */
const configured = Number(process.env.LLM_GLOBAL_HOURLY_LIMIT);
const GLOBAL_LIMIT = Number.isFinite(configured) && configured > 0 ? configured : 600;

/**
 * Gate for the unauthenticated model routes. They spend the admin's API key,
 * so they get three checks: same-origin (a hostile page can't conscript its
 * visitors' browsers into spending it), a per-IP bucket, and a global budget
 * that holds even when the caller has many addresses.
 * ponytail: one global counter for all routes. Split it per route when one
 * route's traffic starts starving another.
 */
export function modelGuard(req: Request, route: string, max = 30, windowMs = 60_000): NextResponse | null {
  const csrf = csrfFailure(req);
  if (csrf) return csrf;
  const rl = rateLimit(clientKey(req, route), max, windowMs);
  if (!rl.ok) return NextResponse.json({ error: "RATE_LIMITED", retryAfter: rl.retryAfter }, { status: 429 });
  const budget = rateLimit("llm:global", GLOBAL_LIMIT, 3_600_000);
  if (!budget.ok) return NextResponse.json({ error: "BUSY", retryAfter: budget.retryAfter }, { status: 429 });
  return null;
}

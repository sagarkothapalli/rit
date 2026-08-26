/* Minimal in-memory rate limiter (per-IP, per-route). Fine for a single-node hackathon demo. */
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
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return `${route}:${fwd}`;
}

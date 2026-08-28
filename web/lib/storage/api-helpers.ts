import { NextResponse } from "next/server";
import { verifiedEmailFromRequest } from "@/lib/email-verification.server";
import { clientKey, rateLimit } from "@/lib/cage/ratelimit";
import { csrfFailure } from "@/lib/security/csrf";
import type { CaseRecord } from "@/lib/domain/case";
import { getCaseRecord } from "./cases.server";
import { isCaseId } from "./id";

export function limited(req: Request, name: string, max = 40, windowMs = 10 * 60_000): NextResponse | null {
  const rl = rateLimit(clientKey(req, name), max, windowMs);
  if (!rl.ok) return NextResponse.json({ error: "RATE_LIMITED", retryAfter: rl.retryAfter }, { status: 429 });
  return null;
}

export function guardWrite(req: Request, name: string): NextResponse | null {
  return csrfFailure(req) ?? limited(req, name);
}

export function requireOwner(req: Request): { email: string } | NextResponse {
  const email = verifiedEmailFromRequest(req);
  if (!email) return NextResponse.json({ error: "EMAIL_NOT_VERIFIED" }, { status: 401 });
  return { email };
}

export async function ownerCase(req: Request, id: string): Promise<{ email: string; record: CaseRecord } | NextResponse> {
  const owner = requireOwner(req);
  if (owner instanceof NextResponse) return owner;
  if (!isCaseId(id)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const record = await getCaseRecord(id);
  if (!record || record.archivedAt) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (record.ownerEmail !== owner.email) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  return { email: owner.email, record };
}

export async function readJson(req: Request): Promise<unknown | NextResponse> {
  try {
    return await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }
}

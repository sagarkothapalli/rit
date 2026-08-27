import { NextResponse } from "next/server";
import { z } from "zod";
import { getStoredApplication, listStoredApplications, saveStoredApplication } from "@/lib/application-store.server";
import { clientKey, rateLimit } from "@/lib/cage/ratelimit";

export const dynamic = "force-dynamic";

const Ack = z.string().regex(/^PRTI\/ACK\/\d{2}\/[A-Z2-9]{9}$/);
const Pdf = z.string().min(100).max(4_000_000);
const StoredApplicationSchema = z.object({
  acknowledgementNumber: Ack,
  reference: z.string().min(4).max(80),
  createdAt: z.iso.datetime(),
  status: z.literal("PRAJA_ACKNOWLEDGED"),
  governmentSubmissionStatus: z.literal("NOT_SUBMITTED"),
  applicant: z.object({
    name: z.string().trim().min(2).max(160),
    email: z.email().max(254).transform((value) => value.toLowerCase()),
    address: z.string().trim().min(5).max(800),
    mobile: z.string().trim().max(20),
    citizenship: z.literal("Indian"),
    isBpl: z.boolean(),
  }),
  report: z.object({
    reference: z.string(),
    generated_at: z.string(),
    government_submission_status: z.literal("NOT_SUBMITTED"),
    title: z.string().min(1).max(160),
    authority: z.object({ name: z.string().min(1).max(300), ministry: z.string().max(300) }),
    notes: z.object({
      records_sought: z.array(z.string()).max(8),
      date_range: z.string().nullable(),
      place: z.string().nullable(),
      body_hint: z.string().nullable(),
      format: z.string(),
    }).nullable(),
    requests: z.array(z.string().min(1).max(3000)).min(1).max(8),
    transcript: z.string().max(10_000),
    disclaimer: z.string().max(1000),
  }),
  applicationPdfBase64: Pdf,
  receiptPdfBase64: Pdf,
});

export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "application-save"));
  if (!rl.ok) return NextResponse.json({ error: "RATE_LIMITED", retryAfter: rl.retryAfter }, { status: 429 });
  try {
    const parsed = StoredApplicationSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "INVALID_APPLICATION" }, { status: 400 });
    const storage = await saveStoredApplication(parsed.data);
    return NextResponse.json({ ok: true, storage });
  } catch {
    return NextResponse.json({ error: "SAVE_FAILED" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const rl = rateLimit(clientKey(req, "application-read"));
  if (!rl.ok) return NextResponse.json({ error: "RATE_LIMITED", retryAfter: rl.retryAfter }, { status: 429 });
  const url = new URL(req.url);
  const ack = url.searchParams.get("ack")?.trim().toUpperCase();
  if (ack) {
    if (!Ack.safeParse(ack).success) return NextResponse.json({ error: "INVALID_ACKNOWLEDGEMENT" }, { status: 400 });
    const application = await getStoredApplication(ack);
    if (!application) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ application });
  }

  const email = url.searchParams.get("email")?.trim().toLowerCase();
  const otp = url.searchParams.get("otp");
  if (!email || !z.email().safeParse(email).success) return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });
  if (otp !== "123456") return NextResponse.json({ error: "INVALID_VERIFICATION_CODE" }, { status: 401 });
  return NextResponse.json({ applications: await listStoredApplications(email) });
}

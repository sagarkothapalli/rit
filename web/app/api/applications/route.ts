import { NextResponse } from "next/server";
import { z } from "zod";
import { getStoredApplication, listStoredApplications, saveStoredApplication } from "@/lib/application-store.server";
import { clientKey, rateLimit } from "@/lib/cage/ratelimit";
import { verifiedEmailFromRequest } from "@/lib/email-verification.server";

export const dynamic = "force-dynamic";

const Ack = z.string().regex(/^PRTI\/ACK\/\d{2}\/[A-Z2-9]{9}$/);
const Pdf = z.string().min(100).max(4_000_000);

const ApplicantSchema = z.object({
  name: z.string().trim().min(2).max(160),
  gender: z.enum(["Male", "Female", "Transgender"]),
  address: z.string().trim().min(5).max(800),
  pincode: z.string().trim().max(10),
  state: z.string().trim().max(80),
  country: z.string().trim().min(2).max(100),
  areaStatus: z.enum(["Rural", "Urban"]),
  educationalStatus: z.enum(["Literate", "Illiterate"]),
  phone: z.string().trim().max(20),
  mobile: z.string().trim().max(20),
  email: z.string().email().max(254).transform((value) => value.toLowerCase()),
  citizenship: z.literal("Indian"),
  isBpl: z.boolean(),
});

const StoredApplicationSchema = z.object({
  acknowledgementNumber: Ack,
  reference: z.string().min(4).max(80),
  createdAt: z.iso.datetime(),
  status: z.literal("PRAJA_ACKNOWLEDGED"),
  governmentSubmissionStatus: z.literal("NOT_SUBMITTED"),
  applicant: ApplicantSchema,
  report: z.object({
    reference: z.string(),
    generated_at: z.string(),
    government_submission_status: z.literal("NOT_SUBMITTED"),
    title: z.string().min(1).max(160),
    authority: z.object({ name: z.string().min(1).max(300), ministry: z.string().max(300) }),
    jurisdiction: z.enum(["central", "state", "unclear"]).optional().default("unclear"),
    filing_channel: z.string().max(200).nullable().optional().default(null),
    notes: z.object({
      records_sought: z.array(z.string()).max(8),
      date_range: z.string().nullable(),
      place: z.string().nullable(),
      body_hint: z.string().nullable(),
      format: z.string(),
    }).nullable(),
    background: z.string().max(2000).optional().default(""),
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

    // An application may only be stored against an address this browser has
    // verified. Without this, anyone could write records under any email and
    // then read them back through the history endpoint.
    const verified = verifiedEmailFromRequest(req);
    if (!verified) return NextResponse.json({ error: "EMAIL_NOT_VERIFIED" }, { status: 401 });
    if (verified !== parsed.data.applicant.email) {
      return NextResponse.json({ error: "EMAIL_MISMATCH" }, { status: 403 });
    }

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

  // Acknowledgement lookup stays open: the number itself is the secret, it is
  // printed only on the citizen's own receipt, and a citizen who has cleared
  // their cookies must still be able to retrieve their copy.
  const ack = url.searchParams.get("ack")?.trim().toUpperCase();
  if (ack) {
    if (!Ack.safeParse(ack).success) return NextResponse.json({ error: "INVALID_ACKNOWLEDGEMENT" }, { status: 400 });
    const application = await getStoredApplication(ack);
    if (!application) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ application });
  }

  // Listing every application for an address requires proving you own it.
  const verified = verifiedEmailFromRequest(req);
  if (!verified) return NextResponse.json({ error: "EMAIL_NOT_VERIFIED" }, { status: 401 });
  return NextResponse.json({ applications: await listStoredApplications(verified), email: verified });
}

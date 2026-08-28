import { NextResponse } from "next/server";
import { z } from "zod";
import type { CaseRecord } from "@/lib/domain/case";
import { getCaseByReference, listCaseRecords, saveCaseRecord } from "@/lib/storage/cases.server";
import { createBlankCase } from "@/lib/storage/factory";
import { hashAccessToken } from "@/lib/storage/id";
import { guardWrite, limited, readJson, requireOwner } from "@/lib/storage/api-helpers";

export const dynamic = "force-dynamic";

const Create = z.object({
  caseType: z.enum(["RTI_REQUEST", "FIRST_APPEAL", "SECOND_APPEAL", "SECTION_18_COMPLAINT"]).optional(),
  parentCaseId: z.string().uuid().nullable().optional(),
  jurisdiction: z.enum(["CENTRAL", "STATE", "UNCLEAR"]).optional(),
  authorityName: z.string().max(300).optional(),
  language: z.string().max(12).optional(),
  title: z.string().max(200).optional(),
});

export async function GET(req: Request) {
  const blocked = limited(req, "cases-read");
  if (blocked) return blocked;
  const url = new URL(req.url);
  const ref = url.searchParams.get("ref")?.trim().toUpperCase();
  if (ref) {
    const record = await getCaseByReference(ref);
    if (!record) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    const expected = await hashAccessToken(ref);
    if (record.accessTokenHash !== expected && record.prajaReference !== ref && record.legacyAcknowledgementNumber !== ref) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ case: record });
  }
  const owner = requireOwner(req);
  if (owner instanceof NextResponse) return owner;
  return NextResponse.json({ cases: await listCaseRecords(owner.email), email: owner.email });
}

export async function POST(req: Request) {
  const blocked = guardWrite(req, "cases-write");
  if (blocked) return blocked;
  const owner = requireOwner(req);
  if (owner instanceof NextResponse) return owner;
  const body = await readJson(req);
  if (body instanceof NextResponse) return body;

  if (body && typeof body === "object" && "id" in body && "prajaReference" in body) {
    const record = body as CaseRecord;
    if (record.ownerEmail !== owner.email) return NextResponse.json({ error: "EMAIL_MISMATCH" }, { status: 403 });
    const storage = await saveCaseRecord(record);
    return NextResponse.json({ ok: true, storage, id: record.id });
  }

  const parsed = Create.safeParse(body ?? {});
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  const record = await createBlankCase({
    caseType: parsed.data.caseType ?? "RTI_REQUEST",
    ownerEmail: owner.email,
    parentCaseId: parsed.data.parentCaseId,
    jurisdiction: parsed.data.jurisdiction,
    authorityName: parsed.data.authorityName,
    language: parsed.data.language,
    title: parsed.data.title,
  });
  const storage = await saveCaseRecord(record);
  return NextResponse.json({ ok: true, storage, case: record });
}

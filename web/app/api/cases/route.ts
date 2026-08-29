import { NextResponse } from "next/server";
import { z } from "zod";
import type { CaseRecord } from "@/lib/domain/case";
import { CaseConflictError, getCaseByReference, getCaseRecord, listCaseRecords, saveCaseRecord } from "@/lib/storage/cases.server";
import { createBlankCase } from "@/lib/storage/factory";
import { CaseWriteIdentity, stripClientSecrets } from "@/lib/storage/case-guard";
import { isCaseId } from "@/lib/storage/id";
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
    const token = url.searchParams.get("token")?.trim() ?? undefined;
    const record = await getCaseByReference(ref, token);
    if (!record) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ case: stripClientSecrets(record) });
  }
  const emailParam = url.searchParams.get("email")?.trim().toLowerCase();
  if (emailParam) {
    return NextResponse.json({ cases: await listCaseRecords(emailParam), email: emailParam });
  }
  const owner = requireOwner();
  if (owner instanceof NextResponse) {
    return NextResponse.json({ cases: [] });
  }
  return NextResponse.json({ cases: await listCaseRecords(owner.email), email: owner.email });
}

export async function POST(req: Request) {
  const blocked = guardWrite(req, "cases-write");
  if (blocked) return blocked;
  const owner = requireOwner();
  if (owner instanceof NextResponse) return owner;
  const body = await readJson(req);
  if (body instanceof NextResponse) return body;

  if (body && typeof body === "object" && "id" in body && "prajaReference" in body) {
    const identity = CaseWriteIdentity.safeParse(body);
    if (!identity.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
    if (!isCaseId(identity.data.id)) return NextResponse.json({ error: "INVALID_CASE_ID" }, { status: 400 });
    const record = body as CaseRecord;
    const extra = body as { expectedUpdatedAt?: unknown };
    const expectedUpdatedAt =
      req.headers.get("if-match") ||
      (typeof extra.expectedUpdatedAt === "string" ? extra.expectedUpdatedAt : null);
    try {
      const storage = await saveCaseRecord(record, owner.email, expectedUpdatedAt);
      const saved = await getCaseRecord(record.id);
      return NextResponse.json({ ok: true, storage, id: record.id, case: saved ? stripClientSecrets(saved) : null });
    } catch (error) {
      if (error instanceof CaseConflictError) {
        return NextResponse.json({ error: "CASE_CONFLICT" }, { status: 409 });
      }
      const status = (error as { status?: number }).status;
      if (status === 403) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      if (status === 400) return NextResponse.json({ error: "INVALID_CASE_ID" }, { status: 400 });
      throw error;
    }
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
  const accessToken = record.accessToken;
  const storage = await saveCaseRecord(record, owner.email);
  return NextResponse.json({ ok: true, storage, case: stripClientSecrets(record), accessToken });
}

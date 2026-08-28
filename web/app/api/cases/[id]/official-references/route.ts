import { NextResponse } from "next/server";
import { z } from "zod";
import { saveCaseRecord } from "@/lib/storage/cases.server";
import { newId } from "@/lib/storage/id";
import { guardWrite, ownerCase, readJson } from "@/lib/storage/api-helpers";
import { applyCaseEvent } from "@/lib/deadlines/lifecycle";
import { stripClientSecrets } from "@/lib/storage/case-guard";

export const dynamic = "force-dynamic";

const Body = z.object({
  registrationNumber: z.string().min(3).max(80),
  filedAt: z.string().min(8).max(40),
  receivedAt: z.string().min(8).max(40).nullable().optional(),
  referenceKind: z.enum(["ORIGINAL_REQUEST", "TRANSFER", "PART_TRANSFER", "FIRST_APPEAL", "SECOND_APPEAL", "COMPLAINT"]).optional(),
  paymentResult: z.enum(["paid", "failed", "exempt", "not-recorded"]).optional(),
  receiptNote: z.string().max(400).optional(),
  parentOfficialReferenceId: z.string().uuid().nullable().optional(),
  isPrimary: z.boolean().optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = guardWrite(req, "case-ref");
  if (blocked) return blocked;
  const { id } = await ctx.params;
  const loaded = await ownerCase(req, id);
  if (loaded instanceof NextResponse) return loaded;
  const body = await readJson(req);
  if (body instanceof NextResponse) return body;
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  const now = new Date().toISOString();
  const reference = {
    id: newId(),
    caseId: id,
    registrationNumber: parsed.data.registrationNumber.trim(),
    referenceKind: parsed.data.referenceKind ?? defaultKind(loaded.record.caseType),
    source: "USER_REPORTED" as const,
    filedAt: parsed.data.filedAt,
    receivedAt: parsed.data.receivedAt ?? parsed.data.filedAt,
    parentOfficialReferenceId: parsed.data.parentOfficialReferenceId ?? null,
    isPrimary: parsed.data.isPrimary ?? loaded.record.officialReferences.length === 0,
    createdAt: now,
  };
  const event = {
    id: newId(),
    caseId: id,
    officialReferenceId: reference.id,
    eventType: "FILING_RECORDED" as const,
    source: "USER_REPORTED" as const,
    occurredAt: parsed.data.filedAt,
    recordedAt: now,
    payload: { ...parsed.data },
    createdBy: loaded.email,
    idempotencyKey: `filing:${id}:${reference.registrationNumber}`,
  };
  const record = applyCaseEvent(
    { ...loaded.record, officialReferences: [...loaded.record.officialReferences, reference] },
    event,
  );
  await saveCaseRecord(record, loaded.email, loaded.record.updatedAt);
  return NextResponse.json({ case: stripClientSecrets(record) });
}

function defaultKind(caseType: string) {
  if (caseType === "FIRST_APPEAL") return "FIRST_APPEAL" as const;
  if (caseType === "SECOND_APPEAL") return "SECOND_APPEAL" as const;
  if (caseType === "SECTION_18_COMPLAINT") return "COMPLAINT" as const;
  return "ORIGINAL_REQUEST" as const;
}

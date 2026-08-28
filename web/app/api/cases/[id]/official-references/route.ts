import { NextResponse } from "next/server";
import { z } from "zod";
import { saveCaseRecord } from "@/lib/storage/cases.server";
import { newId } from "@/lib/storage/id";
import { guardWrite, ownerCase, readJson } from "@/lib/storage/api-helpers";
import { filingRulesFor } from "@/lib/filing-rules/registry";
import { toDeadlineRecord } from "@/lib/deadlines/calculate";
import type { DeadlineKind } from "@/lib/domain/case";

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
    referenceKind: parsed.data.referenceKind ?? "ORIGINAL_REQUEST",
    source: "USER_REPORTED" as const,
    filedAt: parsed.data.filedAt,
    receivedAt: parsed.data.receivedAt ?? parsed.data.filedAt,
    parentOfficialReferenceId: parsed.data.parentOfficialReferenceId ?? null,
    isPrimary: parsed.data.isPrimary ?? loaded.record.officialReferences.length === 0,
    createdAt: now,
  };
  const rules = filingRulesFor({ caseType: loaded.record.caseType, jurisdiction: loaded.record.jurisdiction });
  const kind: DeadlineKind =
    loaded.record.caseType === "FIRST_APPEAL"
      ? "FAA_DECISION"
      : loaded.record.caseType === "SECOND_APPEAL"
        ? "SECOND_APPEAL_LIMITATION"
        : "REQUEST_RESPONSE";
  const deadline = toDeadlineRecord(newId(), {
    kind,
    startDate: parsed.data.filedAt,
    rule: rules,
    source: "USER_REPORTED",
    caseId: id,
    officialReferenceId: reference.id,
  });
  const record = {
    ...loaded.record,
    filingStatus: "USER_REPORTED_FILED" as const,
    outcomeStatus: "AWAITING_RESPONSE" as const,
    officialReferences: [...loaded.record.officialReferences, reference],
    deadlines: [...loaded.record.deadlines, deadline],
    updatedAt: now,
    events: [
      ...loaded.record.events,
      {
        id: newId(),
        caseId: id,
        officialReferenceId: reference.id,
        eventType: "FILING_RECORDED" as const,
        source: "USER_REPORTED" as const,
        occurredAt: parsed.data.filedAt,
        recordedAt: now,
        payload: parsed.data,
        createdBy: loaded.email,
        idempotencyKey: `filing:${id}:${reference.registrationNumber}`,
      },
    ],
  };
  await saveCaseRecord(record);
  return NextResponse.json({ case: record });
}

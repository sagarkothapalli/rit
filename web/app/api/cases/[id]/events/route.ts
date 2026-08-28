import { NextResponse } from "next/server";
import { z } from "zod";
import { saveCaseRecord } from "@/lib/storage/cases.server";
import { newId } from "@/lib/storage/id";
import { guardWrite, ownerCase, readJson } from "@/lib/storage/api-helpers";
import type { CaseEventType } from "@/lib/domain/events";
import { applyCaseEvent } from "@/lib/deadlines/lifecycle";
import { stripClientSecrets } from "@/lib/storage/case-guard";
import type { OfficialReference } from "@/lib/domain/case";

export const dynamic = "force-dynamic";

const EVENT_TYPES = [
  "REPLY_RECEIVED",
  "FAA_DECISION_RECEIVED",
  "COMMISSION_NOTICE_RECEIVED",
  "REQUEST_TRANSFERRED",
  "REQUEST_PART_TRANSFERRED",
  "ADDITIONAL_FEE_DEMAND",
  "ADDITIONAL_FEE_PAID",
  "SUPPORTING_DOCUMENT_REQUESTED",
  "SUPPORTING_DOCUMENT_UPLOADED",
  "REQUEST_RETURNED",
  "CASE_DISPOSED",
  "CASE_CLOSED",
] as const;

const Body = z.object({
  eventType: z.enum(EVENT_TYPES),
  occurredAt: z.string().min(8).max(40),
  officialReferenceId: z.string().uuid().nullable().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  idempotencyKey: z.string().max(120).optional(),
  transferNumber: z.string().max(80).optional(),
  authorityName: z.string().max(300).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = guardWrite(req, "case-event");
  if (blocked) return blocked;
  const { id } = await ctx.params;
  const loaded = await ownerCase(req, id);
  if (loaded instanceof NextResponse) return loaded;
  const body = await readJson(req);
  if (body instanceof NextResponse) return body;
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  const key = parsed.data.idempotencyKey ?? `event:${id}:${parsed.data.eventType}:${parsed.data.occurredAt}:${parsed.data.transferNumber ?? ""}`;
  if (loaded.record.events.some((item) => item.idempotencyKey === key)) {
    return NextResponse.json({ case: stripClientSecrets(loaded.record), duplicate: true });
  }
  const now = new Date().toISOString();
  const eventType = parsed.data.eventType as CaseEventType;
  const event = {
    id: newId(),
    caseId: id,
    officialReferenceId: parsed.data.officialReferenceId ?? null,
    eventType,
    source: "USER_REPORTED" as const,
    occurredAt: parsed.data.occurredAt,
    recordedAt: now,
    payload: { ...(parsed.data.payload ?? {}), transferNumber: parsed.data.transferNumber },
    createdBy: loaded.email,
    idempotencyKey: key,
  };
  let newReference: OfficialReference | undefined;
  if (
    (eventType === "REQUEST_TRANSFERRED" || eventType === "REQUEST_PART_TRANSFERRED") &&
    parsed.data.transferNumber?.trim()
  ) {
    newReference = {
      id: newId(),
      caseId: id,
      registrationNumber: parsed.data.transferNumber.trim(),
      referenceKind: eventType === "REQUEST_PART_TRANSFERRED" ? "PART_TRANSFER" : "TRANSFER",
      source: "USER_REPORTED",
      filedAt: parsed.data.occurredAt,
      receivedAt: parsed.data.occurredAt,
      parentOfficialReferenceId: parsed.data.officialReferenceId ?? null,
      isPrimary: eventType === "REQUEST_TRANSFERRED",
      createdAt: now,
      authorityName: parsed.data.authorityName ?? null,
    };
  }
  const record = applyCaseEvent(loaded.record, event, { newReference });
  await saveCaseRecord(record, loaded.email, loaded.record.updatedAt);
  return NextResponse.json({ case: stripClientSecrets(record) });
}

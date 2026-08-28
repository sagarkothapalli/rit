import { NextResponse } from "next/server";
import { z } from "zod";
import { saveCaseRecord } from "@/lib/storage/cases.server";
import { newId } from "@/lib/storage/id";
import { guardWrite, ownerCase, readJson } from "@/lib/storage/api-helpers";
import type { CaseEventType } from "@/lib/domain/events";
import type { OutcomeStatus } from "@/lib/domain/status";

export const dynamic = "force-dynamic";

const Body = z.object({
  eventType: z.string().min(3).max(80),
  occurredAt: z.string().min(8).max(40),
  officialReferenceId: z.string().uuid().nullable().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  idempotencyKey: z.string().max(120).optional(),
});

function outcomeAfter(type: CaseEventType, current: OutcomeStatus): OutcomeStatus {
  if (type === "REPLY_RECEIVED" || type === "FAA_DECISION_RECEIVED" || type === "COMMISSION_NOTICE_RECEIVED") {
    return "REPLY_RECEIVED";
  }
  if (type === "ADDITIONAL_FEE_DEMAND" || type === "SUPPORTING_DOCUMENT_REQUESTED") return "ACTION_REQUIRED";
  if (type === "CASE_DISPOSED") return "DISPOSED";
  if (type === "CASE_CLOSED") return "CLOSED";
  return current;
}

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
  const key = parsed.data.idempotencyKey ?? `event:${id}:${parsed.data.eventType}:${parsed.data.occurredAt}`;
  if (loaded.record.events.some((item) => item.idempotencyKey === key)) {
    return NextResponse.json({ case: loaded.record, duplicate: true });
  }
  const now = new Date().toISOString();
  const eventType = parsed.data.eventType as CaseEventType;
  const record = {
    ...loaded.record,
    outcomeStatus: outcomeAfter(eventType, loaded.record.outcomeStatus),
    filingStatus: eventType === "REQUEST_RETURNED" ? "RETURNED" as const : loaded.record.filingStatus,
    updatedAt: now,
    events: [
      ...loaded.record.events,
      {
        id: newId(),
        caseId: id,
        officialReferenceId: parsed.data.officialReferenceId ?? null,
        eventType,
        source: "USER_REPORTED" as const,
        occurredAt: parsed.data.occurredAt,
        recordedAt: now,
        payload: parsed.data.payload ?? {},
        createdBy: loaded.email,
        idempotencyKey: key,
      },
    ],
  };
  await saveCaseRecord(record);
  return NextResponse.json({ case: record });
}

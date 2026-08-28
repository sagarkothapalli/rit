import { NextResponse } from "next/server";
import { z } from "zod";
import { CaseConflictError, deleteCaseRecord, saveCaseRecord } from "@/lib/storage/cases.server";
import { stripClientSecrets } from "@/lib/storage/case-guard";
import { guardWrite, ownerCase, readJson } from "@/lib/storage/api-helpers";

export const dynamic = "force-dynamic";

const Patch = z.object({
  title: z.string().max(200).optional(),
  remindersEnabled: z.boolean().optional(),
  reminderPreferences: z
    .object({
      inApp: z.boolean(),
      email: z.boolean(),
      sms: z.boolean(),
    })
    .optional(),
  archivedAt: z.string().datetime().nullable().optional(),
  preparationStatus: z.enum(["DRAFT", "NEEDS_INFORMATION", "READY_FOR_REVIEW", "READY_TO_FILE", "PACKET_GENERATED"]).optional(),
  mockPayment: z
    .object({
      status: z.enum(["NONE", "DEMO_PAID", "DEMO_EXEMPT"]),
      receiptId: z.string().nullable(),
      paidAt: z.string().nullable(),
      amountRupees: z.number(),
    })
    .optional(),
});

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const loaded = await ownerCase(req, id);
  if (loaded instanceof NextResponse) return loaded;
  return NextResponse.json({ case: stripClientSecrets(loaded.record) });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = guardWrite(req, "case-patch");
  if (blocked) return blocked;
  const { id } = await ctx.params;
  const loaded = await ownerCase(req, id);
  if (loaded instanceof NextResponse) return loaded;
  const body = await readJson(req);
  if (body instanceof NextResponse) return body;
  const parsed = Patch.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  const record = {
    ...loaded.record,
    ...parsed.data,
    updatedAt: new Date().toISOString(),
  };
  try {
    await saveCaseRecord(record, loaded.email, loaded.record.updatedAt);
  } catch (error) {
    if (error instanceof CaseConflictError) return NextResponse.json({ error: "CASE_CONFLICT" }, { status: 409 });
    throw error;
  }
  return NextResponse.json({ case: stripClientSecrets(record) });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = guardWrite(req, "case-delete");
  if (blocked) return blocked;
  const { id } = await ctx.params;
  const loaded = await ownerCase(req, id);
  if (loaded instanceof NextResponse) return loaded;
  const purge = new URL(req.url).searchParams.get("purge") === "1";
  const ok = await deleteCaseRecord(id, loaded.email, purge);
  if (!ok) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ ok: true, purged: purge });
}

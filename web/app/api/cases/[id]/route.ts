import { NextResponse } from "next/server";
import { z } from "zod";
import { saveCaseRecord } from "@/lib/storage/cases.server";
import { guardWrite, ownerCase, readJson } from "@/lib/storage/api-helpers";

export const dynamic = "force-dynamic";

const Patch = z.object({
  title: z.string().max(200).optional(),
  remindersEnabled: z.boolean().optional(),
  archivedAt: z.string().datetime().nullable().optional(),
  preparationStatus: z.enum(["DRAFT", "NEEDS_INFORMATION", "READY_FOR_REVIEW", "READY_TO_FILE", "PACKET_GENERATED"]).optional(),
});

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const loaded = await ownerCase(req, id);
  if (loaded instanceof NextResponse) return loaded;
  return NextResponse.json({ case: loaded.record });
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
  await saveCaseRecord(record);
  return NextResponse.json({ case: record });
}

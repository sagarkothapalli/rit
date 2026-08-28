import { NextResponse } from "next/server";
import { saveCaseRecord } from "@/lib/storage/cases.server";
import { guardWrite, ownerCase } from "@/lib/storage/api-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = guardWrite(req, "case-confirm");
  if (blocked) return blocked;
  const { id } = await ctx.params;
  const loaded = await ownerCase(req, id);
  if (loaded instanceof NextResponse) return loaded;
  const now = new Date().toISOString();
  const record = {
    ...loaded.record,
    preparationStatus: "READY_TO_FILE" as const,
    updatedAt: now,
    draft: { ...loaded.record.draft, confirmedAt: now },
  };
  await saveCaseRecord(record);
  return NextResponse.json({ case: record });
}

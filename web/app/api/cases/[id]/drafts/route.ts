import { NextResponse } from "next/server";
import { saveCaseRecord } from "@/lib/storage/cases.server";
import { newId } from "@/lib/storage/id";
import { guardWrite, ownerCase, readJson } from "@/lib/storage/api-helpers";
import type { CaseDraftPayload } from "@/lib/domain/case";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = guardWrite(req, "case-draft");
  if (blocked) return blocked;
  const { id } = await ctx.params;
  const loaded = await ownerCase(req, id);
  if (loaded instanceof NextResponse) return loaded;
  const body = await readJson(req);
  if (body instanceof NextResponse) return body;
  const payload = (body as { payload?: CaseDraftPayload }).payload;
  if (!payload) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  const now = new Date().toISOString();
  const version = loaded.record.draftVersion + 1;
  const record = {
    ...loaded.record,
    draftVersion: version,
    updatedAt: now,
    draft: {
      id: newId(),
      caseId: id,
      version,
      payload,
      portalText: (body as { portalText?: string }).portalText ?? loaded.record.draft.portalText,
      characterCount: (body as { characterCount?: number }).characterCount ?? 0,
      createdAt: now,
      confirmedAt: null,
    },
  };
  await saveCaseRecord(record, loaded.email, loaded.record.updatedAt);
  return NextResponse.json({ case: record });
}

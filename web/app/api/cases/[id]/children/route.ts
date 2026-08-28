import { NextResponse } from "next/server";
import { z } from "zod";
import { saveCaseRecord } from "@/lib/storage/cases.server";
import { createBlankCase } from "@/lib/storage/factory";
import { guardWrite, ownerCase, readJson } from "@/lib/storage/api-helpers";

export const dynamic = "force-dynamic";

const Body = z.object({
  caseType: z.enum(["FIRST_APPEAL", "SECOND_APPEAL", "SECTION_18_COMPLAINT", "RTI_REQUEST"]),
  targetOfficialReferenceId: z.string().uuid().nullable().optional(),
  title: z.string().max(200).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = guardWrite(req, "case-child");
  if (blocked) return blocked;
  const { id } = await ctx.params;
  const loaded = await ownerCase(req, id);
  if (loaded instanceof NextResponse) return loaded;
  const body = await readJson(req);
  if (body instanceof NextResponse) return body;
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  const child = await createBlankCase({
    caseType: parsed.data.caseType,
    ownerEmail: loaded.email,
    parentCaseId: id,
    jurisdiction: loaded.record.jurisdiction,
    authorityName: loaded.record.authorityName,
    language: loaded.record.language,
    title: parsed.data.title ?? `${parsed.data.caseType} — ${loaded.record.title}`,
  });
  child.targetOfficialReferenceId = parsed.data.targetOfficialReferenceId ?? loaded.record.officialReferences.find((item) => item.isPrimary)?.id ?? null;
  child.applicant = { ...loaded.record.applicant };
  await saveCaseRecord(child);
  return NextResponse.json({ case: child });
}

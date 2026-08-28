import { NextResponse } from "next/server";
import { z } from "zod";
import { filingRulesFor } from "@/lib/filing-rules/registry";
import { validateAttachment } from "@/lib/filing-rules/validate";
import { newId } from "@/lib/storage/id";
import { guardWrite, ownerCase, readJson } from "@/lib/storage/api-helpers";

export const dynamic = "force-dynamic";

const Body = z.object({
  originalName: z.string().min(1).max(200),
  mimeType: z.string().max(100),
  byteSize: z.number().int().positive().max(20_000_000),
  kind: z.string().max(40).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = guardWrite(req, "attach-init");
  if (blocked) return blocked;
  const { id } = await ctx.params;
  const loaded = await ownerCase(req, id);
  if (loaded instanceof NextResponse) return loaded;
  const body = await readJson(req);
  if (body instanceof NextResponse) return body;
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  const rules = filingRulesFor({ caseType: loaded.record.caseType, jurisdiction: loaded.record.jurisdiction });
  const problems = validateAttachment(
    { name: parsed.data.originalName, mimeType: parsed.data.mimeType, byteSize: parsed.data.byteSize },
    rules,
  );
  if (problems.some((item) => item.blocking)) {
    return NextResponse.json({ error: "INVALID_ATTACHMENT", problems }, { status: 400 });
  }
  return NextResponse.json({ uploadId: newId(), problems });
}

import { NextResponse } from "next/server";
import { refreshDeadlineStatus } from "@/lib/deadlines/calculate";
import { ownerCase } from "@/lib/storage/api-helpers";
import { limited } from "@/lib/storage/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = limited(req, "case-deadlines");
  if (blocked) return blocked;
  const { id } = await ctx.params;
  const loaded = await ownerCase(req, id);
  if (loaded instanceof NextResponse) return loaded;
  const deadlines = loaded.record.deadlines.map((item) => refreshDeadlineStatus(item));
  return NextResponse.json({ deadlines });
}

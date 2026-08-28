import { NextResponse } from "next/server";
import { fallbackPreview, scheduleNotifications } from "@/lib/notifications/outbox";
import { ownerCase } from "@/lib/storage/api-helpers";
import { limited } from "@/lib/storage/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const blocked = limited(req, "case-notes");
  if (blocked) return blocked;
  const { id } = await ctx.params;
  const loaded = await ownerCase(req, id);
  if (loaded instanceof NextResponse) return loaded;
  return NextResponse.json({ notifications: fallbackPreview(scheduleNotifications(loaded.record)) });
}

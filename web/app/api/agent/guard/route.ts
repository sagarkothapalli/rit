import { NextResponse } from "next/server";
import { z } from "zod";
import { GuardSchema, guardFallback, NotesSchema, type GateResult } from "@/lib/cage/schemas";
import { callModelJSON, getModelConfig } from "@/lib/cage/client";
import { guardPrompt } from "@/lib/cage/prompts";
import { modelGuard } from "@/lib/cage/ratelimit";
import {
  centralPortalIneligible,
  needsThirdPartyNotice,
  preScreen,
  reconcileGuard,
} from "@/lib/cage/exemptions";

export const dynamic = "force-dynamic";

/**
 * The transcript is accepted here so the deterministic screen can read the
 * citizen's own words, not only the records the notes gate extracted from
 * them. A jailbreak that survives extraction still has to survive this.
 */
const Body = z.object({
  notes: NotesSchema,
  transcript: z.string().max(6000).optional().default(""),
});

export async function POST(req: Request) {
  const blocked = modelGuard(req, "guard");
  if (blocked) return blocked;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  const { notes, transcript } = parsed.data;

  // Deterministic first. This result stands even if the model is unreachable.
  const screen = preScreen(transcript, notes);
  const advisories = {
    third_party_notice: needsThirdPartyNotice(transcript, notes),
    central_portal_ineligible: centralPortalIneligible(notes),
  };

  const cfg = await getModelConfig();
  if (!cfg) {
    const data = { ...reconcileGuard(screen, guardFallback), ...advisories };
    const result: GateResult<z.infer<typeof GuardSchema>> = { mode: "SIMULATED", data };
    return NextResponse.json(result);
  }

  const shape = `{
  "verdict": "ALLOWED" | "EXEMPT",
  "clause": string | null,
  "reason_summary": string,
  "safe_reframing": string | null,
  "third_party_notice": boolean,
  "central_portal_ineligible": boolean
}`;

  const { system, user } = guardPrompt(JSON.stringify(notes), shape);
  const res = await callModelJSON({ cfg, model: cfg.fast, system, user, maxTokens: 500 }, (x) =>
    GuardSchema.parse(x)
  );

  const merged = reconcileGuard(screen, res.ok ? res.data : null);
  const data = {
    ...merged,
    // Either signal is enough to raise the advisory; neither can clear it.
    third_party_notice: advisories.third_party_notice || Boolean(res.ok && res.data.third_party_notice),
    central_portal_ineligible:
      advisories.central_portal_ineligible || Boolean(res.ok && res.data.central_portal_ineligible),
  };

  const result: GateResult<z.infer<typeof GuardSchema>> = res.ok
    ? { mode: "LIVE", model: res.model, data }
    : { mode: "SIMULATED", data };
  return NextResponse.json(result);
}

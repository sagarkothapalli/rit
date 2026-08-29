import { NextResponse } from "next/server";
import type { z } from "zod";
import { DraftRequest, DraftSchema, draftFallback, type GateResult } from "@/lib/cage/schemas";
import { callModelJSON, getModelConfig } from "@/lib/cage/client";
import { draftPrompt } from "@/lib/cage/prompts";
import { modelGuard } from "@/lib/cage/ratelimit";

export const dynamic = "force-dynamic";

/** Code-side draft lint — the model never gets the final word. */
function lintDraft(draft: z.infer<typeof DraftSchema>): { ok: boolean; repaired?: z.infer<typeof DraftSchema> } {
  const bad = /(corrupt|corruption|guilty|punish|scam|ghapla|घपला|भ्रष्ट)/i;
  const requests = draft.requests
    .map((r) => r.trim())
    .filter((r) => r.length >= 20)
    .map((r) => (/^please provide/i.test(r) ? r : `Please provide ${r.charAt(0).toLowerCase()}${r.slice(1)}`));
  const background = draft.background?.trim() ?? "";
  const total = background.length + requests.join(" ").length;
  const clean = !requests.some((r) => bad.test(r)) && !bad.test(background);
  if (requests.length >= 3 && requests.length <= 8 && total <= 3000 && clean) {
    return {
      ok: true,
      repaired: { title: draft.title.slice(0, 160), background: background.slice(0, 900), requests },
    };
  }
  return { ok: false };
}

export async function POST(req: Request) {
  const blocked = modelGuard(req, "draft");
  if (blocked) return blocked;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }
  const parsed = DraftRequest.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  const notes = parsed.data.notes;

  const cfg = await getModelConfig();
  if (!cfg) {
    const result: GateResult<z.infer<typeof DraftSchema>> = { mode: "SIMULATED", data: draftFallback(notes) };
    return NextResponse.json(result);
  }

  const shape = `{
  "title": string,
  "background": string,  // 2 to 4 sentences of neutral context, invoking Section 6(1)
  "requests": string[]   // 4 to 8 items, each one sentence starting with "Please provide"
}`;

  const { system, user } = draftPrompt(JSON.stringify(notes), shape);
  const res = await callModelJSON({ cfg, model: cfg.strong || cfg.fast, system, user, maxTokens: 1400 }, (x) =>
    DraftSchema.parse(x)
  );

  if (res.ok) {
    const lint = lintDraft(res.data);
    const data = lint.ok && lint.repaired ? lint.repaired : draftFallback(notes);
    const result: GateResult<z.infer<typeof DraftSchema>> = {
      mode: lint.ok ? "LIVE" : "SIMULATED",
      model: lint.ok ? res.model : undefined,
      data,
    };
    return NextResponse.json(result);
  }

  const result: GateResult<z.infer<typeof DraftSchema>> = { mode: "SIMULATED", data: draftFallback(notes) };
  return NextResponse.json(result);
}

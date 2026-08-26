import { z } from "zod";

/* ============================================================
   The cage: every model output passes zod or it never reaches
   the UI. Fallbacks are deterministic and honest.
   ============================================================ */

export const NotesSchema = z.object({
  records_sought: z.array(z.string().min(3)).max(8).default([]),
  date_range: z.string().max(80).nullable().optional().default(null),
  place: z.string().max(120).nullable().optional().default(null),
  body_hint: z.string().max(160).nullable().optional().default(null),
  format: z.enum(["certified copies", "inspection", "electronic copies", "samples", "unspecified"]).default("unspecified"),
  missing_essentials: z.array(z.enum(["records_sought", "date_range", "place", "body_hint", "format"])).default([]),
  is_state_matter: z.boolean().default(false),
  state_name: z.string().max(60).nullable().optional().default(null),
});
export type Notes = z.infer<typeof NotesSchema>;

export const GuardSchema = z.object({
  verdict: z.enum(["ALLOWED", "EXEMPT"]),
  clause: z.string().max(40).nullable().optional().default(null),
  reason_summary: z.string().max(420),
  safe_reframing: z.string().max(300).nullable().optional().default(null),
});
export type Guard = z.infer<typeof GuardSchema>;

export const DraftSchema = z.object({
  title: z.string().max(160),
  requests: z.array(z.string().min(20)).min(3).max(5),
});
export type Draft = z.infer<typeof DraftSchema>;

export const ExplainSchema = z.object({
  candidates: z
    .array(
      z.object({
        id: z.string(),
        why: z.string().max(200),
        caveat: z.string().max(160),
      })
    )
    .max(3),
});
export type Explain = z.infer<typeof ExplainSchema>;

export const NotesRequest = z.object({ transcript: z.string().min(4).max(6000), lang: z.string().max(20) });
export const GuardRequest = z.object({ notes: NotesSchema });
export const DraftRequest = z.object({ notes: NotesSchema });
export const ExplainRequest = z.object({
  notes: NotesSchema,
  transcript: z.string().max(6000).optional(),
  draft: DraftSchema.optional(),
});

export interface GateResult<T> {
  mode: "LIVE" | "SIMULATED";
  model?: string;
  data: T;
}

/* ---------- Deterministic fallbacks (SIMULATED mode / model failure) ---------- */

export function notesFallback(transcript: string): Notes {
  const t = transcript.toLowerCase();
  const state = /\b(municipal|nagar|ward|panchayat|bijli|electricity board|safai|sewer|jal board|tehsil|patwari|land record)\b/.test(t);
  const records: string[] = [];
  if (/(highway|nhai|nh-?\d|expressway|pothole|राजमार्ग|हाईवे)/.test(t)) {
    records.push(
      "sanctioned budget and year-wise expenditure for the highway work described",
      "work order, contractor name, and agreement for the stretch described",
      "quality inspection reports and delay-penalty records for the work"
    );
  }
  if (/(budget|fund|paisa|पैसा|बजट|kharch|खर्च|money)/.test(t) && !records.some((r) => /budget/i.test(r))) {
    records.push("the sanctioned budget and expenditure records for the work described");
  }
  if (/(contract|theka|ठेका|contractor|ठेकेदार)/.test(t)) records.push("the work order and contractor agreement for the work described");
  if (/(inspection|quality|जांच|जाँच|gati)/.test(t)) records.push("quality inspection reports submitted for the work described");
  if (/(road|sadak|सड़क|सडक)/.test(t) && records.length === 0) {
    records.push(
      "sanctioned budget and expenditure records for the road work described",
      "work order and contractor agreement for the road described",
      "quality inspection reports submitted for the work"
    );
  }
  if (records.length === 0) {
    records.push(
      "file notings and official correspondence relating to the matter described",
      "names and designations of the officials responsible for the matter described",
      "rules, guidelines, or orders on file that govern the matter described"
    );
  }
  return {
    records_sought: records.slice(0, 6),
    date_range: /(month|mahine|महीने|साल|year|saal)/.test(t) ? "the period mentioned by the citizen" : null,
    place: null,
    body_hint: state ? "State/local body indicated by the narrative" : null,
    format: "certified copies",
    missing_essentials: [],
    is_state_matter: state,
    state_name: null,
  };
}

export const guardFallback: Guard = {
  verdict: "ALLOWED",
  clause: null,
  reason_summary: "The stated information need appears to be a request for existing official records and does not obviously target exempt material.",
  safe_reframing: null,
};

export function draftFallback(notes: Notes): Draft {
  const subject = notes.records_sought[0] ?? "the records described";
  return {
    title: `Request for ${notes.format} of official records`,
    requests: [
      `Please provide ${notes.format} of ${subject}${notes.date_range ? `, for ${notes.date_range}` : ""}${notes.place ? `, relating to ${notes.place}` : ""}.`,
      `Please provide ${notes.format} of the file notings and official correspondence relating to the matter described.`,
      `Please provide ${notes.format} of the names and designations of the officials responsible for the matter described.`,
    ],
  };
}

export function explainFallback(
  candidates: Array<{ id: string; name: string; matched: string[] }>
): Explain {
  return {
    candidates: candidates.slice(0, 3).map((c) => ({
      id: c.id,
      why:
        c.matched.length > 0
          ? `Directory keywords matched your ask about "${c.matched.slice(0, 3).join('", "')}".`
          : "Matched the directory entry most relevant to your stated information need.",
      caveat: "Confirm this authority actually holds the records before filing.",
    })),
  };
}

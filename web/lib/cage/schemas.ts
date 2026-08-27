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
  /**
   * Which level of government holds these records. Decided in code by
   * `lib/jurisdiction.ts`, never left to the model — RTI Online accepts
   * Central public authorities only, so a wrong call here sends the citizen
   * to a portal that will reject the application without a refund.
   */
  jurisdiction: z.enum(["central", "state", "unclear"]).default("unclear"),
  /** Where the application actually has to be filed. */
  filing_channel: z.string().max(200).nullable().optional().default(null),
  /** Plain-language reasons, shown to the citizen when this is a State matter. */
  jurisdiction_reasons: z.array(z.string().max(300)).max(6).default([]),
});
export type Notes = z.infer<typeof NotesSchema>;

export const GuardSchema = z.object({
  verdict: z.enum(["ALLOWED", "EXEMPT"]),
  clause: z.string().max(40).nullable().optional().default(null),
  reason_summary: z.string().max(420),
  safe_reframing: z.string().max(300).nullable().optional().default(null),
  /** Section 11: a third party must be given notice, extending the clock to 40 days. */
  third_party_notice: z.boolean().optional().default(false),
  /** The Central portal returns State-body applications without refund. */
  central_portal_ineligible: z.boolean().optional().default(false),
});
export type Guard = z.infer<typeof GuardSchema>;

export const DraftSchema = z.object({
  title: z.string().max(160),
  /**
   * Neutral factual context, 1-3 sentences, stated before the numbered
   * points. The official form is a single free-text field, so a real
   * application opens with the background before it enumerates records.
   */
  background: z.string().max(900).optional().default(""),
  requests: z.array(z.string().min(20)).min(3).max(8),
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

/** Structured hints captured by the live intake agent and confirmed by the citizen. */
export const IntakeHintsSchema = z.object({
  summary: z.string().max(600).optional(),
  place: z.string().max(120).nullable().optional(),
  date_range: z.string().max(80).nullable().optional(),
  authority_hint: z.string().max(160).nullable().optional(),
  /** What the voice agent concluded about jurisdiction during the call. */
  jurisdiction: z.enum(["central", "state", "unclear"]).optional(),
  state_name: z.string().max(80).nullable().optional(),
  jurisdiction_note: z.string().max(400).nullable().optional(),
});
export type IntakeHints = z.infer<typeof IntakeHintsSchema>;

export const NotesRequest = z.object({
  transcript: z.string().min(4).max(6000),
  lang: z.string().max(20),
  intake: IntakeHintsSchema.optional(),
});
export const GuardRequest = z.object({
  notes: NotesSchema,
  transcript: z.string().max(6000).optional().default(""),
});
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
    // normalizeNotes() overwrites these with the deterministic verdict.
    jurisdiction: state ? "state" : "unclear",
    filing_channel: null,
    jurisdiction_reasons: [],
  };
}

export const guardFallback: Guard = {
  verdict: "ALLOWED",
  clause: null,
  reason_summary: "The stated information need appears to be a request for existing official records and does not obviously target exempt material.",
  safe_reframing: null,
  third_party_notice: false,
  central_portal_ineligible: false,
};

export function draftFallback(notes: Notes): Draft {
  const subject = notes.records_sought[0] ?? "the records described";
  const where = notes.place ? ` at ${notes.place}` : "";
  const when = notes.date_range ? ` during ${notes.date_range}` : "";
  return {
    title: `Request for ${notes.format} of official records`,
    background:
      `Under Section 6(1) of the Right to Information Act, 2005, I request ${notes.format} of the records listed below`
      + `${where}${when}. Where a record is held by another public authority, please transfer this application under Section 6(3) `
      + `within five days and inform me of the transfer.`,
    requests: [
      `Please provide ${notes.format} of ${subject}${notes.date_range ? `, for ${notes.date_range}` : ""}${notes.place ? `, relating to ${notes.place}` : ""}.`,
      `Please provide ${notes.format} of the file notings, inter-departmental correspondence, and approvals recorded on the subject matter described above.`,
      `Please provide ${notes.format} of the names and designations of the officials who dealt with the matter, together with the dates on which each acted.`,
      `Please provide ${notes.format} of the rules, circulars, guidelines, or standing orders that governed the decisions taken in this matter.`,
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

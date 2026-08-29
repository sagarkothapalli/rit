import { classifyJurisdiction, type JurisdictionVerdict } from "@/lib/jurisdiction";
import { extractSpokenFields } from "./proceed";

/* ============================================================
   Session memory — one request, one memory, nothing persisted.

   The intake used to be stateless on our side: every turn, the
   model was handed a system prompt and whatever the Live API
   still had in its context window, and the app tracked only the
   raw transcript. Two failures followed from that.

   1. The agent lost track. It re-asked the place the citizen had
      already named, forgot the period, and drifted back to its
      own idea of the conversation half way through — because
      nothing ever reminded it what had already been established.

   2. It talked over the citizen. Every backstop the app owns
      (the jurisdiction flag, the identity answer, the handoff
      order) was injected as its own turn the moment it was
      raised, so three notes meant three interruptions.

   This module fixes both, and deliberately does it in memory
   only:

   - `facts` accumulates what the citizen has actually said,
     derived deterministically — never guessed.
   - `questionsAsked` keeps the agent's own questions verbatim,
     so the briefing can forbid repeats in any language without
     having to parse that language.
   - `briefing()` renders the whole thing as one short system
     note, which re-grounds the model on the established facts
     at a turn boundary.
   - `queue()` / `drain()` coalesce every system note the app
     wants to inject into ONE turn, sent only when the citizen
     is not speaking.

   NOTHING here is written to sessionStorage, localStorage, a
   cookie, or the server. The memory exists for the duration of
   one intake request and dies with it: `createSessionMemory()`
   is called afresh on every start, so a second request never
   inherits the first one's state. `intakeMemory.ts` persists the
   finished handoff, and that is a different thing — this is the
   working memory of a conversation in progress.
   ============================================================ */

/** Highest priority first: the order injected notes are spoken in. */
export type NoteKind = "identity" | "scope" | "jurisdiction" | "memory" | "proceed";

const NOTE_ORDER: NoteKind[] = ["identity", "scope", "jurisdiction", "memory", "proceed"];

/** Facts established by the citizen, never inferred beyond a regex. */
export interface SessionFacts {
  /** The citizen's opening account of the problem, clipped. */
  concern: string | null;
  /** Place named: a city we recognise, or a ward/locality phrase. */
  place: string | null;
  /** Period the records should cover, as spoken. */
  period: string | null;
  /** Authority or office the citizen named themselves. */
  office: string | null;
  mobile: string | null;
  pincode: string | null;
  email: string | null;
}

export interface SessionMemory {
  /** Add a chunk of citizen speech. Returns the facts after the update. */
  noteCitizen(text: string): SessionFacts;
  /** Add a chunk of agent speech, so its questions are remembered. */
  noteAgent(text: string): void;
  /** The running transcript of the citizen, whitespace-normalised. */
  transcript(): string;
  /** Facts established so far. */
  facts(): SessionFacts;
  /** The deterministic jurisdiction verdict for everything said so far. */
  verdict(): JurisdictionVerdict | null;
  /** True once the jurisdiction has been stated to the citizen. */
  jurisdictionSpoken(): boolean;
  markJurisdictionSpoken(): void;
  /** Queue a system note. Repeated queues of the same kind collapse. */
  queue(kind: NoteKind, text: string): void;
  /** True when anything is waiting to be injected. */
  pending(): boolean;
  /** Take everything queued as one turn's worth of text, or null. */
  drain(): string | null;
  /** Drop a queued note without sending it. */
  cancel(kind: NoteKind): void;
  /** A short system note re-stating what is established. Null if nothing is. */
  briefing(): string | null;
  /** True when the briefing would say something new since it was last sent. */
  briefingIsStale(): boolean;
  /** Record that the citizen was heard speaking, for the silence gate. */
  markCitizenSpoke(): void;
  /** Milliseconds since the citizen was last heard. */
  silenceMs(): number;
}

/* ---------- deterministic extraction ---------- */

const MONTHS =
  "January|February|March|April|May|June|July|August|September|October|November|December"
  + "|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec";

/**
 * The period the records should cover, as the citizen said it.
 * A local copy on purpose: `lib/intake.ts` owns the richer version
 * but pulls the authority directory in with it, and this module is
 * loaded by the live hook on every session.
 */
function spokenPeriod(text: string): string | null {
  const monthSpan = text.match(
    new RegExp(`\\b(${MONTHS})\\s*(?:to|through|till|until|[-–—])\\s*(${MONTHS})(?:\\s+(?:of\\s+)?)?(20\\d{2})?\\b`, "i"),
  );
  if (monthSpan) {
    const year = monthSpan[3] || text.match(/\b20\d{2}\b/)?.[0];
    return `${monthSpan[1]}–${monthSpan[2]}${year ? ` ${year}` : ""}`;
  }
  const relative = text.match(
    /\b((?:last|past|previous|since|from|for)\s+(?:the\s+)?(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|a few)?\s*(?:month|months|mahine|महीने|year|years|saal|साल|week|weeks|day|days|din|दिन)s?)\b/i,
  );
  if (relative) return relative[1].replace(/\s+/g, " ").trim();
  const years = [...text.matchAll(/\b(20\d{2})\b/g)].map((match) => match[1]);
  if (years.length === 1) return years[0];
  if (years.length >= 2) return `${years[0]}–${years[years.length - 1]}`;
  return null;
}

/** A ward, sector, or named locality the citizen gave. */
function spokenPlace(text: string): string | null {
  const ward = text.match(/\b(ward\s*(?:no\.?\s*)?\d+[A-Za-z]?)\b/i);
  if (ward) return ward[1];
  const sector = text.match(/\b(sector\s*\d+[A-Za-z]?)\b/i);
  if (sector) return sector[1];
  return null;
}

/**
 * An office the citizen named. Only the unmistakable ones: this
 * exists to stop the agent asking "which office handles it?" after
 * being told, not to route the application.
 */
const OFFICE_PATTERNS: Array<{ test: RegExp; name: string }> = [
  { test: /\b(nhai|national highways? authority)\b/i, name: "NHAI" },
  { test: /\b(epfo|provident fund office)\b/i, name: "EPFO" },
  { test: /\b(passport office|regional passport|rpo)\b/i, name: "Regional Passport Office" },
  { test: /\b(income tax (?:office|department))\b/i, name: "Income Tax Department" },
  { test: /\b(municipal corporation|nagar nigam|nagar palika|महानगरपालिका|नगर निगम)\b/i, name: "the municipal corporation" },
  { test: /\b(gram panchayat|panchayat office)\b/i, name: "the Gram Panchayat" },
  { test: /\b(collector(?:ate)? office|collectorate)\b/i, name: "the District Collectorate" },
  { test: /\b(tehsil|tahsil|mandal revenue|mro office|taluk office)\b/i, name: "the Tehsil / Mandal Revenue Office" },
  { test: /\b(ward office)\b/i, name: "the ward office" },
  { test: /\b(pwd|public works department|r&b)\b/i, name: "the State PWD / R&B department" },
  { test: /\b(electricity board|discom)\b/i, name: "the electricity distribution company" },
  { test: /\b(police station|thana)\b/i, name: "the police station" },
  { test: /\b(post office)\b/i, name: "the post office" },
  { test: /\b(railway (?:office|division))\b/i, name: "the railway division office" },
];

function spokenOffice(text: string): string | null {
  for (const { test, name } of OFFICE_PATTERNS) {
    if (test.test(text)) return name;
  }
  return null;
}

/** Trim to a whole word. */
function clip(text: string, limit: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit);
  const space = cut.lastIndexOf(" ");
  return `${space > limit * 0.6 ? cut.slice(0, space) : cut}…`;
}

/**
 * The agent's questions, verbatim. Kept as spoken so the briefing
 * can forbid a repeat in any of the twelve languages without this
 * module having to understand a word of them.
 *
 * Read from the whole accumulated agent transcript rather than from
 * each chunk, because transcription splits mid-sentence: "Which
 * months should the records" and "cover?" arrive separately, and
 * neither fragment is a question on its own.
 *
 * A question mark is used by every script we support; the full stop,
 * danda, and Urdu full stop are treated as sentence ends so a
 * question is not returned with the sentence before it attached.
 */
function questionsIn(text: string): string[] {
  const found: string[] = [];
  const sentences = text.split(/(?<=[.!?？।۔])\s+/);
  for (const sentence of sentences) {
    const clean = sentence.replace(/\s+/g, " ").trim();
    if (!/[?？]$/.test(clean)) continue;
    if (clean.length < 6) continue;
    const question = clip(clean, 120);
    // The same question is re-read on every chunk as it is completed, so a
    // fragment already recorded is replaced by the full version rather than
    // listed beside it.
    const supersedes = found.findIndex(
      (existing) => existing.startsWith(question) || question.startsWith(existing),
    );
    if (supersedes >= 0) {
      if (question.length > found[supersedes].length) found[supersedes] = question;
      continue;
    }
    found.push(question);
  }
  return found;
}

/** How long the concern has to be before it is worth quoting back. */
const CONCERN_MIN = 24;
const CONCERN_MAX = 260;
const TRANSCRIPT_MAX = 6000;
const QUESTION_MEMORY = 8;

export function createSessionMemory(): SessionMemory {
  const startedAt = Date.now();
  let citizen = "";
  let agent = "";
  let lastHeardAt = startedAt;
  let spoken = false;
  let cachedVerdict: JurisdictionVerdict | null = null;
  /** Signature of the last briefing sent, so an unchanged one is not resent. */
  let lastBriefingSignature: string | null = null;
  const asked: string[] = [];
  const queued = new Map<NoteKind, string>();
  const facts: SessionFacts = {
    concern: null,
    place: null,
    period: null,
    office: null,
    mobile: null,
    pincode: null,
    email: null,
  };

  /** Fill a fact once. The first answer stands; a later mention never overwrites. */
  function keep<K extends keyof SessionFacts>(key: K, value: string | null) {
    if (facts[key] || !value) return;
    facts[key] = value;
  }

  function refresh(): SessionFacts {
    const verdict = classifyJurisdiction(citizen);
    cachedVerdict = verdict.level === "unclear" && !verdict.localBody ? cachedVerdict : verdict;
    if (!facts.concern && citizen.length >= CONCERN_MIN) {
      facts.concern = clip(citizen, CONCERN_MAX);
    }
    keep("place", spokenPlace(citizen) ?? verdict.localBody?.city ?? verdict.stateName);
    keep("period", spokenPeriod(citizen));
    keep("office", spokenOffice(citizen));
    const fields = extractSpokenFields(citizen);
    keep("mobile", fields.mobile);
    keep("pincode", fields.pincode);
    keep("email", fields.email);
    return { ...facts };
  }

  function signature(): string {
    return [
      facts.concern ? "c" : "",
      facts.place ?? "",
      facts.period ?? "",
      facts.office ?? "",
      facts.mobile ?? "",
      facts.pincode ?? "",
      facts.email ?? "",
      cachedVerdict?.level ?? "",
      spoken ? "spoken" : "",
      // The questions themselves: the count alone does not change when a
      // fragment is replaced by the completed sentence.
      asked.join("~"),
    ].join("|");
  }

  function briefing(): string | null {
    const known: string[] = [];
    if (facts.concern) known.push(`their concern, in their words: "${facts.concern}"`);
    if (facts.place) known.push(`the place: ${facts.place}`);
    if (facts.period) known.push(`the period: ${facts.period}`);
    if (facts.office) known.push(`the office they named: ${facts.office}`);
    if (facts.mobile) known.push(`mobile: ${facts.mobile}`);
    if (facts.pincode) known.push(`PIN code: ${facts.pincode}`);
    if (facts.email) known.push(`email: ${facts.email}`);
    if (known.length === 0 && asked.length === 0) return null;

    const lines = [
      "(System note, not spoken by the citizen. This is your memory of THIS conversation — read it before you speak.",
    ];
    if (known.length > 0) {
      lines.push(
        `Already established, so treat it as known and never ask for it again: ${known.join("; ")}.`,
      );
    }
    if (asked.length > 0) {
      const recent = asked.slice(-QUESTION_MEMORY);
      lines.push(
        `You have already asked these questions — do NOT ask any of them, or a reworded version, a second time: ${recent.map((question) => `"${question}"`).join(" ")}`,
      );
    }
    if (cachedVerdict && cachedVerdict.level !== "unclear") {
      lines.push(
        `Jurisdiction is settled: this is a ${cachedVerdict.level === "central" ? "CENTRAL" : "STATE / local-body"} matter`
        + `${cachedVerdict.recommendedBody ? `, held by ${cachedVerdict.recommendedBody}` : ""}.`
        + `${spoken ? " You have already told the citizen. Do not raise it again." : ""}`,
      );
    }
    lines.push(
      "Continue from here — do not restart the intake, do not re-introduce yourself, and do not go back over"
      + " ground the citizen has already covered. Ask only for a fact that is genuinely still missing, and let"
      + " the citizen finish speaking before you reply.)",
    );
    return lines.join(" ");
  }

  return {
    noteCitizen(text) {
      if (text) {
        citizen = `${citizen} ${text}`.replace(/\s+/g, " ").trim().slice(0, TRANSCRIPT_MAX);
        lastHeardAt = Date.now();
      }
      return refresh();
    },
    noteAgent(text) {
      if (!text) return;
      agent = `${agent} ${text}`.replace(/\s+/g, " ").trim().slice(0, TRANSCRIPT_MAX);
      /*
       * Re-read the whole agent transcript, not just this chunk: a question
       * split across two chunks is a question in neither of them. The list is
       * rebuilt rather than appended to, so a fragment recorded a moment ago
       * is replaced by the completed sentence instead of sitting next to it.
       */
      asked.length = 0;
      asked.push(...questionsIn(agent).slice(-QUESTION_MEMORY));
    },
    transcript: () => citizen,
    facts: () => ({ ...facts }),
    verdict: () => cachedVerdict,
    jurisdictionSpoken: () => spoken,
    markJurisdictionSpoken() {
      spoken = true;
    },
    queue(kind, text) {
      if (text) queued.set(kind, text);
    },
    pending: () => queued.size > 0,
    drain() {
      if (queued.size === 0) return null;
      const parts: string[] = [];
      for (const kind of NOTE_ORDER) {
        const note = queued.get(kind);
        if (note) parts.push(note);
      }
      queued.clear();
      if (parts.length === 0) return null;
      lastBriefingSignature = signature();
      return parts.join("\n");
    },
    cancel(kind) {
      queued.delete(kind);
    },
    briefing,
    briefingIsStale: () => lastBriefingSignature !== signature() && briefing() !== null,
    markCitizenSpoke() {
      lastHeardAt = Date.now();
    },
    silenceMs: () => Date.now() - lastHeardAt,
  };
}

import { z } from "zod";
import type { FunctionDeclaration } from "@google/genai";
import { SUPPORTED_LANG_CODES } from "./constants";

/* ============================================================
   The live intake contract. The persona is scoped to this site
   by instruction AND by construction: the session declares
   exactly one tool and no search tool, so the model has no path
   to the open web. Its output never drafts anything — the
   handoff only feeds the existing notes gate (GATE 1).

   The agent gathers three things in one conversation:
     1. the jurisdiction — Central, or State/local body
     2. the information need (what records, where, when)
     3. the applicant particulars the official form requires

   Jurisdiction is first because this service mirrors RTI Online,
   which only accepts Central public authorities. A ward road or
   a municipal complaint must be flagged unprompted; citizens do
   not know to ask.
   ============================================================ */

const LANG_LIST = SUPPORTED_LANG_CODES.join(", ");

export const LIVE_INTAKE_SYSTEM = `You are the RTI Voice Assistant — an active, supportive helper who assists citizens in preparing their Right to Information (RTI Act, 2005) request.

ROLE & PERSONA
- You act like an experienced helper at a citizen assistance desk: attentive, patient, constructive, and focused on turning the citizen's problem into a formal request for official government records.
- Your mission has three parts and you must complete ALL of them before finishing:
  A. Determine whether the matter belongs to the Central government or to a State government / local body, and TELL the citizen.
  B. Understand the concern and identify which official records to ask for (work orders, budgets, sanction letters, inspection reports, file notings), with the place and the time period.
  C. Collect the applicant particulars that the official RTI form requires.

LANGUAGE — MIRROR THE CITIZEN EXACTLY (HIGHEST PRIORITY)
- ALWAYS speak the language the citizen speaks. Hindi in, Hindi out. Telugu in, Telugu out. Tamil, Bengali, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia, Urdu, English — the same rule for every supported language (${LANG_LIST}).
- If the citizen switches language mid-conversation, switch with them immediately.
- Greeting, questions, confirmations, and closing are ALL in the citizen's language.

PART A — JURISDICTION TRIAGE (YOU RAISE THIS FIRST, UNPROMPTED)
This service mirrors the RTI Online portal (rtionline.gov.in), which accepts applications ONLY for CENTRAL government public authorities. It cannot accept applications for State governments or local bodies. Almost no citizen knows this, so they will never ask. You must tell them yourself, every time it applies.

- As soon as you know the subject and the place, decide: CENTRAL, or STATE / local body? Do this BEFORE asking about time periods, records, or applicant details. Never wait to be asked. Never require the citizen to ask "does this come under state or central?".
- If it is a STATE or LOCAL-BODY matter, say so immediately in one or two short sentences, in their language, covering exactly three things:
  1. This is not a Central government matter.
  2. RTI Online — this Central portal — cannot accept it.
  3. WHO they must actually approach, named specifically. For Visakhapatnam: the Greater Visakhapatnam Municipal Corporation (GVMC). Hyderabad: GHMC. Bengaluru: BBMP. Mumbai: BMC. Chennai: Greater Chennai Corporation. Delhi: MCD. A village: the Gram Panchayat or Zilla Parishad. A State road: the State PWD / R&B department.
  Then immediately reassure them that you will still prepare the complete RTI application, correctly addressed to that authority, which they can file through their State's RTI channel. Then carry on with the intake.
- STATE / LOCAL-BODY subjects — flag these: colony, ward, or village roads and their maintenance; potholes on local roads; drainage, sewerage, open drains; garbage, sanitation, sweeping; street lights; water supply, taps, borewells; property tax and house tax; building permissions, layout approvals, encroachment; municipal or panchayat contractors, tenders, work orders; State PWD / R&B roads and State highways; DISCOM / electricity board supply; State police stations and FIRs; RTO and State transport; district and area hospitals, PHCs; land records, patta, mutation, sub-registrar; ration cards and PDS; government and State-board schools; anything belonging to a Municipal Corporation, Nagar Nigam, Nagar Palika, Panchayat, Collectorate, Tehsil, or a named State department.
- CENTRAL subjects — proceed normally, no flag: passports and RPOs; NHAI and national highways (NH numbers), FASTag, national highway toll plazas; EPFO and provident fund; income tax, PAN, TDS; Aadhaar and UIDAI; Indian Railways; GST, customs, central excise; nationalised banks and RBI; NTA exams (NEET, JEE, CUET); CBSE and Kendriya Vidyalayas; AIIMS, ESIC, CGHS, Ayushman Bharat; India Post; Election Commission; LPG and petroleum PSUs; defence, ISRO, DRDO; CPWD; any named Union ministry.
- A city name is only the LOCATION, not the authority. "My passport is delayed and I am in Visakhapatnam" is still CENTRAL (Regional Passport Office) — do NOT flag it as a State matter.
- Centrally funded schemes (MGNREGA, PMAY, PMGSY, Jal Jeevan, Swachh Bharat, Smart City) are executed by State agencies: the execution and contractor records sit with the State or local body, while the Central nodal ministry holds only sanction and fund-release records. Say this plainly when it applies.
- If you genuinely cannot tell, ask ONE short question about which office handles it locally, then decide. Never invent a body name you are unsure of — name the level instead ("your municipal corporation").
- Never refuse and never dead-end the citizen. You always continue the intake and always hand off. Do not say "I cannot help", "go to the State portal instead", or "this service is only for the central government".

PART B — THE INFORMATION NEED
1. Greet with ONE short sentence asking what issue they are facing or what records they need. Then listen.
2. Listen to the whole concern before asking anything.
3. Apply Part A and speak the jurisdiction flag if it applies.
4. Ask only for material facts that are genuinely missing, one question at a time, at most three:
   - Place / project / locality
   - Period or date range
   - Department or office, if they know it
   "I don't know" is always fine. Never press.

PART C — THE APPLICANT PARTICULARS
Once you understand the concern, tell the citizen you need a few details for the form, then collect them conversationally. Ask for related items together, not one field at a time:
   - Full name
   - Gender (male, female, or transgender)
   - Postal address for the reply, and the PIN code
   - State or Union Territory
   - Whether their address is rural or urban
   - Whether they can read and write (educational status: literate or illiterate) — ask this gently, for example "Should we mark you as literate on the form?"
   - Mobile number (needed for SMS alerts) and email address
   - Whether they hold a Below Poverty Line card, because BPL applicants pay no fee
Rules for Part C:
   - Read a spelled-out email or number back to the citizen once to confirm it.
   - Never invent, guess, or auto-complete a name, number, address, or email. Leave a field out entirely rather than filling it with a plausible value.
   - If the citizen declines a detail, move on. They can type it themselves later.
   - Never ask for an Aadhaar number, a PAN number, a bank account, a date of birth, or an age. The official form does not collect them and the portal forbids uploading identity documents.

HANDOFF — THE ONLY WAY THE CITIZEN MOVES FORWARD
The citizen is on step 2 of nine. Steps 3 to 9 (records, eligibility, the written application, the authority, their details, the PDF, the acknowledgement) are done on screen and CANNOT START until you call submit_intake. Saying "I am preparing your application" without calling the tool leaves the citizen stuck on this step forever. The words are not the handoff — the tool call is.
- When you have Parts A and B, and either have Part C or the citizen has declined it, conclude in a single turn:
  1. One short line assuring them, in their language: "Got it, I am preparing your application now."
  2. In THAT SAME TURN, call the submit_intake tool with everything you actually captured. Omit any field the citizen never gave; do not fill it with a guess.
- STOP-AND-HAND-OFF TRIGGER: the moment the citizen indicates they are finished, stop collecting and call submit_intake in that same turn with whatever you have — even if Part C is incomplete, even if you were mid-way through a list of questions. Treat all of these, and their equivalents in any language, as that signal: "that's it", "that's all", "nothing else", "I don't need anything further", "proceed", "go ahead", "carry on", "next step", "file it", "submit it", "draft it", "I'm done", "I'm ready", "bas", "ho gaya", "kuch nahi", "aage badho", "kar do", "ante", "chaalu", "ayipoyindi", "podhum", "mudinthathu", "saaku", "mathi", "zhala", "hoye geche", "thai gayu".
- After such a confirmation you must NEVER: ask another question, ask "do we need anything else?", ask "is there anything more you would like to add?", say you are drafting and then wait, or offer further help. Those replies trap the citizen in a loop. Confirmation means: one short line, then the tool call, then stop.
- Anything still missing is not a reason to keep talking. The citizen reviews and edits every field on screen in the steps that follow, so an incomplete handoff is always better than another question.
- Always set jurisdiction: "state" if you flagged a State or local-body matter, "central" for a Central public authority, "unclear" only if you truly could not tell. Put the specific records holder you named into authority_hint (for example "Greater Visakhapatnam Municipal Corporation (GVMC)"), the State into state_name, and one line recording what you told the citizen into jurisdiction_note.
- NEVER say "I cannot file this", "you must go to the website yourself", "I am just an AI", or "would you like help wording it?". The site's next stages take over after your tool call so the citizen can review, edit, preview the A4 form, and receive an acknowledgement.
- After calling submit_intake, say ONE short closing line in their language and STOP.`;

export const submitIntakeDeclaration = {
  name: "submit_intake",
  description:
    "Finish and END the voice intake, and hand the citizen to the next step of the site. This is the ONLY way the citizen advances past the intake — nothing on screen moves until you call it, so call it as soon as they confirm they are finished, even if some particulars are missing. Report only values the citizen actually stated — omit anything you did not hear. After calling this tool, say one short goodbye and stop speaking.",
  parameters: {
    type: "OBJECT",
    properties: {
      detected_lang: {
        type: "STRING",
        description: "BCP-47 code of the language the citizen actually spoke, from the supported list",
      },
      summary: {
        type: "STRING",
        description: "One-line neutral summary of the records or information the citizen wants",
      },
      jurisdiction: {
        type: "STRING",
        enum: ["central", "state", "unclear"],
        description:
          "'state' if the records belong to a State government or local body and therefore cannot be filed on the Central RTI Online portal, 'central' if a Central public authority holds them, 'unclear' only if undeterminable",
      },
      state_name: {
        type: "STRING",
        description: "The State or Union Territory whose government or local body is concerned, if identifiable",
      },
      jurisdiction_note: {
        type: "STRING",
        description:
          "One line recording what you told the citizen about jurisdiction and which authority they must approach",
      },
      place: { type: "STRING", description: "Place, locality, or project the citizen stated" },
      date_range: { type: "STRING", description: "Time period the citizen stated" },
      authority_hint: {
        type: "STRING",
        description:
          "The public authority that holds these records. For a State matter, the local body or State department you named to the citizen, e.g. 'Greater Visakhapatnam Municipal Corporation (GVMC)'",
      },
      applicant_name: { type: "STRING", description: "Full name exactly as the citizen gave it" },
      gender: { type: "STRING", description: "One of: Male, Female, Transgender" },
      address: { type: "STRING", description: "Postal address for the reply, as stated" },
      pincode: { type: "STRING", description: "Six digit PIN code, digits only" },
      state: { type: "STRING", description: "Indian State or Union Territory name" },
      area_status: { type: "STRING", description: "One of: Rural, Urban" },
      educational_status: { type: "STRING", description: "One of: Literate, Illiterate" },
      mobile: { type: "STRING", description: "Ten digit Indian mobile number, digits only" },
      phone: { type: "STRING", description: "Landline number, if the citizen gave one" },
      email: { type: "STRING", description: "Email address, spelled out and confirmed with the citizen" },
      is_bpl: { type: "BOOLEAN", description: "True only if the citizen said they hold a BPL card" },
    },
    required: ["detected_lang", "summary", "jurisdiction"],
  },
} as unknown as FunctionDeclaration;

/** Free text the model may phrase loosely; coerced to the form's fixed options. */
const GENDER_MAP: Record<string, "Male" | "Female" | "Transgender"> = {
  male: "Male",
  man: "Male",
  m: "Male",
  female: "Female",
  woman: "Female",
  f: "Female",
  transgender: "Transgender",
  trans: "Transgender",
  other: "Transgender",
};

const AREA_MAP: Record<string, "Rural" | "Urban"> = {
  rural: "Rural",
  village: "Rural",
  urban: "Urban",
  city: "Urban",
  town: "Urban",
};

const EDUCATION_MAP: Record<string, "Literate" | "Illiterate"> = {
  literate: "Literate",
  educated: "Literate",
  yes: "Literate",
  illiterate: "Illiterate",
  no: "Illiterate",
};

function mapped<T extends string>(value: string | null | undefined, table: Record<string, T>): T | null {
  if (!value) return null;
  return table[value.trim().toLowerCase()] ?? null;
}

function digits(value: string | null | undefined, length?: number): string | null {
  if (!value) return null;
  const only = value.replace(/\D/g, "");
  if (!only) return null;
  if (length && only.length !== length) return null;
  return only;
}

function email(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase().replace(/\s+/g, "");
  return /^\S+@\S+\.\S+$/.test(trimmed) ? trimmed : null;
}

const IntakeHandoffSchema = z.object({
  detected_lang: z.string().max(20).catch("en-IN"),
  summary: z.string().max(600).catch(""),
  jurisdiction: z.enum(["central", "state", "unclear"]).catch("unclear"),
  state_name: z.string().max(80).nullable().catch(null),
  jurisdiction_note: z.string().max(400).nullable().catch(null),
  place: z.string().max(120).nullable().catch(null),
  date_range: z.string().max(80).nullable().catch(null),
  authority_hint: z.string().max(160).nullable().catch(null),
  applicant_name: z.string().max(160).nullable().catch(null),
  gender: z.string().max(30).nullable().catch(null),
  address: z.string().max(800).nullable().catch(null),
  pincode: z.string().max(20).nullable().catch(null),
  state: z.string().max(80).nullable().catch(null),
  area_status: z.string().max(30).nullable().catch(null),
  educational_status: z.string().max(30).nullable().catch(null),
  mobile: z.string().max(30).nullable().catch(null),
  phone: z.string().max(30).nullable().catch(null),
  email: z.string().max(254).nullable().catch(null),
  is_bpl: z.boolean().nullable().catch(null),
});

export interface IntakeApplicant {
  name: string | null;
  gender: "Male" | "Female" | "Transgender" | null;
  address: string | null;
  pincode: string | null;
  state: string | null;
  areaStatus: "Rural" | "Urban" | null;
  educationalStatus: "Literate" | "Illiterate" | null;
  mobile: string | null;
  phone: string | null;
  email: string | null;
  isBpl: boolean | null;
}

export interface IntakeHandoff {
  detected_lang: string;
  summary: string;
  /** What the agent decided about who holds the records. */
  jurisdiction: "central" | "state" | "unclear";
  state_name: string | null;
  /** One line recording what the agent told the citizen about jurisdiction. */
  jurisdiction_note: string | null;
  place: string | null;
  date_range: string | null;
  authority_hint: string | null;
  applicant: IntakeApplicant;
}

/** Tolerant parse: a malformed tool call must never crash the session. */
export function normalizeHandoff(raw: unknown): IntakeHandoff {
  const parsed = IntakeHandoffSchema.safeParse(raw ?? {});
  const data = parsed.success ? parsed.data : IntakeHandoffSchema.parse({});
  const lang = (SUPPORTED_LANG_CODES as readonly string[]).includes(data.detected_lang)
    ? data.detected_lang
    : "en-IN";
  return {
    detected_lang: lang,
    summary: data.summary.trim().slice(0, 600) || "The citizen described their concern during a live voice intake.",
    jurisdiction: data.jurisdiction,
    state_name: data.state_name?.trim() || null,
    jurisdiction_note: data.jurisdiction_note?.trim() || null,
    place: data.place?.trim() || null,
    date_range: data.date_range?.trim() || null,
    authority_hint: data.authority_hint?.trim() || null,
    applicant: {
      name: data.applicant_name?.trim() || null,
      gender: mapped(data.gender, GENDER_MAP),
      address: data.address?.trim() || null,
      pincode: digits(data.pincode, 6),
      state: data.state?.trim() || null,
      areaStatus: mapped(data.area_status, AREA_MAP),
      educationalStatus: mapped(data.educational_status, EDUCATION_MAP),
      mobile: digits(data.mobile, 10),
      phone: digits(data.phone),
      email: email(data.email),
      isBpl: data.is_bpl,
    },
  };
}

/** True when the agent captured enough to prefill the details step usefully. */
export function hasApplicantData(applicant: IntakeApplicant): boolean {
  return Boolean(
    applicant.name || applicant.address || applicant.mobile || applicant.email || applicant.state,
  );
}

import type { Guard, Notes } from "@/lib/cage/schemas";

/* ============================================================
   Exemption pre-screen. Runs BEFORE the model and takes
   precedence over it, so a refusal never depends on a model
   being reachable, in a good mood, or un-jailbroken.

   Coverage is the whole refusal surface of the Act, not just
   Section 8(1):
     - Section 8(1)(a)-(j)  substantive exemptions
     - Section 9            copyright of a third party
     - Section 11           third-party information
     - Section 24 / Sch. II intelligence & security organisations
   Plus two things the Act does not cover at all, which citizens
   frequently ask for anyway:
     - opinions / reasons / "why" questions (s.2(f) "information"
       means material on record, not an answer invented for you)
     - records that do not exist yet, or future intentions
   ============================================================ */

export interface Rule {
  /** Section reference shown to the citizen. */
  clause: string;
  /** Matched against the transcript and the extracted records. */
  test: RegExp;
  /** Plain-language reason. Never legalese. */
  reason: string;
  /** A lawful way to ask for adjacent records, where one exists. */
  reframing: string | null;
}

/**
 * Ordered most-specific first. The first match wins, so a request that
 * trips several rules is refused under the narrowest applicable clause.
 */
export const EXEMPTION_RULES: Rule[] = [
  /* ---------- Section 24 — exempt organisations ---------- */
  {
    clause: "24",
    test: /\b(r&aw|raw agency|research and analysis wing|intelligence bureau|\bib\b|narcotics control bureau|\bncb\b|enforcement directorate|\bed\b(?!ucation)|directorate of revenue intelligence|\bdri\b|central economic intelligence bureau|special frontier force|aviation research centre|special protection group|\bspg\b|national security guard|\bnsg\b|assam rifles|border security force|\bbsf\b|central reserve police force|\bcrpf\b|indo[- ]tibetan border police|\bitbp\b|central industrial security force|\bcisf\b|special service bureau|national technical research organisation|\bntro\b|financial intelligence unit|\bfiu\b)\b/i,
    reason:
      "This organisation is listed in the Second Schedule of the RTI Act, so the Act does not apply to it — except for allegations of corruption or human rights violation, which follow a separate route.",
    reframing:
      "If your concern is an allegation of corruption or a human rights violation, that specific category can still be pursued through the Central Information Commission.",
  },

  /* ---------- Section 8(1)(a) — sovereignty, security, strategic ---------- */
  {
    clause: "8(1)(a)",
    test: /\b(troop (movement|deployment|position)|military deployment|nuclear (weapon|warhead|launch|arsenal)|missile (design|blueprint|guidance)|weapon (design|blueprint|schematic)|defence (blueprint|deployment plan)|war plan|operational plan|strategic (asset|installation) (location|coordinates)|cyber ?attack (capability|plan)|codebook|cipher key|encryption key|security clearance file|counter[- ]?terror(ism)? operation|source of intelligence|informant identity|surveillance target list)\b/i,
    reason:
      "This targets national security, defence, or strategic information, which the Act keeps out of disclosure.",
    reframing:
      "Aggregate, already-published information such as a sanctioned budget head or an audited expenditure total is normally still available.",
  },

  /* ---------- Section 8(1)(b) — courts ---------- */
  {
    clause: "8(1)(b)",
    test: /\b(expressly forbidden (to be published )?by (any )?court|court has (forbidden|prohibited) (its )?(publication|disclosure)|sealed cover|in camera proceeding|contempt of court)\b/i,
    reason:
      "A court has forbidden publication of this material, or disclosing it would constitute contempt of court.",
    reframing:
      "The case number, listing dates, and final orders of a decided matter are usually part of the public record.",
  },

  /* ---------- Section 8(1)(c) — privilege of the legislature ---------- */
  {
    clause: "8(1)(c)",
    test: /\b(breach of privilege|privilege of parliament|privilege committee (proceeding|record)|unpublished (parliament|assembly) (paper|record))\b/i,
    reason: "Disclosure would breach the privilege of Parliament or a State Legislature.",
    reframing:
      "Questions and answers actually laid on the table of the House are published and can be asked for by date and number.",
  },

  /* ---------- Section 8(1)(d) — commercial confidence, trade secrets, IP ---------- */
  {
    clause: "8(1)(d)",
    test: /\b(trade secret|proprietary (formula|recipe|algorithm|source code)|source code of|secret formula|manufacturing process of|competitor'?s? (bid|pricing|cost sheet)|unopened (bid|tender)|bid before opening|commercial(ly)? confiden|intellectual property of (a|the) (private|third))\b/i,
    reason:
      "This is commercial confidence, a trade secret, or intellectual property of a third party, and no larger public interest has been shown.",
    reframing:
      "After a tender is decided, the award order, the accepted rates, the evaluation minutes, and the comparative statement are ordinarily disclosable.",
  },

  /* ---------- Section 8(1)(e) — fiduciary relationship ---------- */
  {
    clause: "8(1)(e)",
    test: /\b(fiduciary|another (person|employee)'?s? (service|personnel) (record|file)|someone else'?s? (bank|salary|tax) (record|return|statement)|third party'?s? (medical|financial) record)\b/i,
    reason:
      "This information is held in a fiduciary capacity for someone else, and no larger public interest has been shown.",
    reframing:
      "Your own records are always available to you, and rules, policies, and sanctioned strength figures are disclosable.",
  },

  /* ---------- Section 8(1)(f) — foreign governments ---------- */
  {
    clause: "8(1)(f)",
    test: /\b(received in confidence from (a )?foreign|foreign government'?s? confidential|diplomatic cable|secret (treaty|protocol|annexure)|confidential (bilateral|diplomatic) (note|communication))\b/i,
    reason: "This was received in confidence from a foreign government.",
    reframing:
      "Treaties and agreements that have been laid before Parliament or officially published can be asked for by name and date.",
  },

  /* ---------- Section 8(1)(g) — safety of a person or source ---------- */
  {
    clause: "8(1)(g)",
    test: /\b(identity of (the )?(informant|whistle ?blower|complainant|witness|source)|name of the (informant|whistle ?blower|witness|protected witness)|who (complained|reported|informed) (about|against)|witness (address|location)|protected witness)\b/i,
    reason:
      "Disclosure would endanger the life or physical safety of a person, or identify a confidential source or informant.",
    reframing:
      "The action taken on a complaint, and the outcome, can be requested without identifying who made it.",
  },

  /* ---------- Section 8(1)(h) — ongoing investigation / prosecution ---------- */
  {
    clause: "8(1)(h)",
    test: /\b(ongoing investigation|investigation (is )?(in progress|pending|underway)|case diary|charge ?sheet (before|not yet) fil|under investigation (by|with)|ongoing (raid|search|seizure) operation|investigation strategy|arrest plan)\b/i,
    reason:
      "This would impede an investigation, the apprehension of an accused, or a prosecution that is still in progress.",
    reframing:
      "Once the investigation concludes, the final report and the action taken can be requested. The FIR number and its date are usually available now.",
  },

  /* ---------- Section 8(1)(i) — cabinet papers, deliberations ---------- */
  {
    clause: "8(1)(i)",
    test: /\b(cabinet (paper|note|decision file|minute)s?|council of ministers'? (deliberation|discussion)|cabinet committee (record|note)|ccea note|before (the )?decision is (taken|made)|deliberation(s)? (that are|still) (ongoing|incomplete))\b/i,
    reason:
      "Cabinet papers and the deliberations of the Council of Ministers stay exempt until the matter is complete or over.",
    reframing:
      "Once the decision is taken and the matter is complete, the decision, the reasons, and the material on which it was based must be made public.",
  },

  /* ---------- Section 8(1)(j) — personal information ---------- */
  {
    clause: "8(1)(j)",
    test: /\b((personal|private|home|residential) (bank|account|phone|mobile|address|salary|asset|property|medical|health|family) (detail|record|number|information)|bank (account|balance) (number|detail)s? of|salary slip of|caste certificate of|(minister|officer|official|mla|mp|neta|collector|employee)(')?s? (personal|private|family|medical|marital|caste|religion|romantic)|aadhaar number of|pan (card|number) of|passport number of|call (detail )?record|whatsapp (chat|message)|private (chat|message|email)s? of|marital status of|(his|her|their) (wife|husband|spouse|child|children|son|daughter)'?s? (name|detail|record))\b/i,
    reason:
      "This asks for personal information with no relationship to any public activity or interest, and no larger public interest has been shown.",
    reframing:
      "Where a public servant's conduct in office is the concern, ask for the official records instead: the file notings they signed, the sanctions they approved, and the assets declaration they are required to file.",
  },

  /* ---------- Section 9 — third-party copyright ---------- */
  {
    clause: "9",
    test: /\b(full (text|copy) of (a|the) (copyright|published book)|entire (book|journal|standard|is code|bis standard)|copyrighted work of|pirated copy)\b/i,
    reason:
      "Providing this would infringe the copyright of someone other than the State, which the Act allows a public authority to refuse.",
    reframing:
      "Ask for the specific pages, clauses, or extracts the authority itself relied on, or for the file that references the work.",
  },

  /* ---------- Not "information" under s.2(f) — opinions and advice ---------- */
  {
    clause: "2(f)",
    test: /\b(what is your (opinion|view)|give me (your |an )?(opinion|advice|interpretation)|why did (you|they|the officer|the government) (not )?(think|feel|believe|decide)(?! .{0,30}(record|file|noting|writing))|explain why|justify (your|the) (decision|action)|do you think|should (i|we)|is it (fair|right|correct|justified)|kya (galat|sahi) hai)\b/i,
    reason:
      "The Act gives you material that already exists on record. It does not require an officer to form an opinion, give advice, or answer a 'why' question.",
    reframing:
      "Ask for the written reasons already recorded on the file, the noting sheet, and the rule or order applied — that gets you the same answer in a form the Act can compel.",
  },

  /* ---------- Records that do not exist / future intentions ---------- */
  {
    clause: "2(f)",
    test: /\b(will (you|they|the government) (ever )?(do|build|repair|sanction|approve)|when will (you|they|the government) (do|build|repair|sanction)|future plan(s)? (to|for)|do you (intend|plan) to|guarantee that|promise that|predict)\b/i,
    reason:
      "A request must point at a record that already exists. The Act cannot compel a statement of future intention or a prediction.",
    reframing:
      "Ask for the approved plan, the sanctioned proposal, the tender schedule, or the latest status note already on file — those are existing records that reveal the timeline.",
  },

  /* ---------- Grievance redress, not information ---------- */
  {
    clause: "2(f)",
    test: /\b(punish (the|this) (officer|official|contractor)|take action against|suspend (the|this) (officer|official)|order (them|him|her) to (fix|repair|pay)|refund my|compensate me|transfer (this|the) officer|fire (him|her|them))\b/i,
    reason:
      "This asks a public authority to act or to grant relief. An RTI application obtains records; it is not a grievance or redress petition.",
    reframing:
      "Ask instead for the complaints already registered, the action-taken report, and the rules governing action in such cases — then use that record to pursue redress on the right forum.",
  },
];

export interface PreScreen {
  verdict: "ALLOWED" | "EXEMPT";
  clause: string | null;
  reason_summary: string;
  safe_reframing: string | null;
}

/** Anything a rule should be matched against: the raw words plus the extracted records. */
function searchable(transcript: string, notes: Notes | null): string {
  return [transcript, ...(notes?.records_sought ?? []), notes?.body_hint ?? ""].join(" \n ");
}

/**
 * Deterministic screen. Returns EXEMPT with the narrowest matching clause,
 * or ALLOWED when nothing matches. Never throws.
 */
export function preScreen(transcript: string, notes: Notes | null): PreScreen {
  const haystack = searchable(transcript, notes);
  for (const rule of EXEMPTION_RULES) {
    if (rule.test.test(haystack)) {
      return {
        verdict: "EXEMPT",
        clause: rule.clause,
        reason_summary: rule.reason,
        safe_reframing: rule.reframing,
      };
    }
  }
  return {
    verdict: "ALLOWED",
    clause: null,
    reason_summary:
      "This asks for material that should already exist on an official file, and it does not appear to touch an exemption under the Act.",
    safe_reframing: null,
  };
}

/**
 * Third-party notice (Section 11) is not a refusal — the authority must
 * still process the request, after inviting the third party to object.
 * Surfacing it early sets a realistic expectation about the 40-day clock.
 */
const THIRD_PARTY = /\b(contractor'?s? (agreement|bid|rate|tender)|private (company|firm|contractor|agency)|concessionaire|joint venture|\bpppp?\b|public[- ]private partnership|licensee|another applicant|other (candidate|applicant|student)s?|third part(y|ies))\b/i;

export function needsThirdPartyNotice(transcript: string, notes: Notes | null): boolean {
  return THIRD_PARTY.test(searchable(transcript, notes));
}

/** A request naming a State body cannot be filed on the Central portal at all. */
export function centralPortalIneligible(notes: Notes | null): boolean {
  return Boolean(notes?.is_state_matter);
}

/**
 * Merge the deterministic screen with the model's verdict.
 * The screen can only make the outcome stricter, never looser: if either
 * the screen or the model says EXEMPT, the result is EXEMPT. A model that
 * has been talked into approving something cannot unlock a refusal.
 */
export function reconcileGuard(screen: PreScreen, model: Guard | null): Guard {
  if (screen.verdict === "EXEMPT") {
    return {
      verdict: "EXEMPT",
      clause: screen.clause,
      reason_summary: screen.reason_summary,
      safe_reframing: screen.safe_reframing,
      third_party_notice: false,
      central_portal_ineligible: false,
    };
  }
  if (model && model.verdict === "EXEMPT") return model;
  return {
    verdict: "ALLOWED",
    clause: null,
    reason_summary: model?.reason_summary ?? screen.reason_summary,
    safe_reframing: null,
    third_party_notice: model?.third_party_notice ?? false,
    central_portal_ineligible: model?.central_portal_ineligible ?? false,
  };
}

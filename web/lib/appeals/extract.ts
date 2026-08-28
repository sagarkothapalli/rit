import type { FirstAppealGround } from "@/lib/domain/case";

export interface ExtractedAppealFacts {
  dates: string[];
  registrationNumbers: string[];
  groundHint: FirstAppealGround | null;
  background: string;
  grounds: string;
  informationNotSupplied: string;
}

const DATE_RE = /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2},?\s+\d{4})\b/gi;
const REF_RE = /\b(PRTI\/(?:ACK|FA1|FA2|C18)\/\d{2}\/[A-Z2-9]{9}|[A-Z]{2,}[\/-]?[A-Z0-9]{2,}[\/-][A-Z0-9\/-]{4,})\b/g;

function isoGuess(raw: string): string {
  const trimmed = raw.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) return trimmed;
  const slash = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(trimmed);
  if (slash) {
    const year = slash[3].length === 2 ? `20${slash[3]}` : slash[3];
    return `${year}-${slash[2].padStart(2, "0")}-${slash[1].padStart(2, "0")}`;
  }
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return trimmed;
  return new Date(parsed).toISOString().slice(0, 10);
}

export function extractAppealFacts(spoken: string): ExtractedAppealFacts {
  const text = spoken.trim();
  const dates = [...text.matchAll(DATE_RE)].map((match) => isoGuess(match[1])).filter(Boolean);
  const registrationNumbers = [...text.matchAll(REF_RE)].map((match) => match[1].toUpperCase());
  const lower = text.toLowerCase();
  let groundHint: FirstAppealGround | null = null;
  if (/\bno (reply|response)|did not (reply|respond)|silence|deemed refusal/.test(lower)) groundHint = "NO_RESPONSE";
  else if (/refus|denied access|section 8/.test(lower)) groundHint = "REFUSED_ACCESS";
  else if (/fee|rupees|₹|unreasonable/.test(lower)) groundHint = "UNREASONABLE_FEE";
  else if (/incomplete|misleading|false|wrong information/.test(lower)) groundHint = "INCOMPLETE_MISLEADING_FALSE";
  else if (text) groundHint = "OTHER";

  const background = text
    ? `The applicant states: ${text.replace(/\s+/g, " ").trim()}`
    : "";
  const grounds = groundHint
    ? `On the material stated, the applicant seeks a decision on the ground of ${groundHint.replaceAll("_", " ").toLowerCase()}.`
    : "";
  const informationNotSupplied = dates[0]
    ? `Records relating to the period around ${dates[0]} were not supplied as requested.`
    : "";

  return {
    dates: [...new Set(dates)],
    registrationNumbers: [...new Set(registrationNumbers)],
    groundHint,
    background,
    grounds,
    informationNotSupplied,
  };
}

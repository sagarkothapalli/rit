import { classifyJurisdiction } from "@/lib/jurisdiction";
import { searchDirectory } from "@/lib/retrieval";

export interface NotesLike {
  records_sought: string[];
  date_range: string | null | undefined;
  place: string | null | undefined;
  body_hint: string | null | undefined;
  format: "certified copies" | "inspection" | "electronic copies" | "samples" | "unspecified";
  missing_essentials: string[];
  is_state_matter: boolean;
  state_name: string | null | undefined;
  jurisdiction?: "central" | "state" | "unclear";
  filing_channel?: string | null | undefined;
  jurisdiction_reasons?: string[];
}

interface Pattern {
  test: RegExp;
  records: string[];
  body?: string;
}

const PATTERNS: Pattern[] = [
  {
    test: /\b(mumbai\s*[-–—]?\s*pune|pune\s*[-–—]?\s*mumbai)\b[\s\S]{0,40}\b(expressway|toll)|\b(expressway|toll)\b[\s\S]{0,40}\b(mumbai\s*[-–—]?\s*pune|pune\s*[-–—]?\s*mumbai)\b/i,
    records: [
      "month-wise toll collection statements for the Mumbai-Pune Expressway",
      "statements showing allocation and utilisation of toll revenue for debt servicing, operation, and maintenance",
      "sanction orders, work orders, contractor agreements, and expenditure for projects and repairs",
      "road-condition, safety, quality-inspection, and completion reports for repair works",
      "file notings and audit observations on toll collection, projects, and maintenance",
    ],
    body: "Maharashtra State Road Development Corporation (MSRDC)",
  },
  {
    test: /\b(nhai|nh-?\d|national highway|expressway|flyover|toll|fastag|pothole|राजमार्ग|हाईवे|गड्ढ)\b/i,
    records: [
      "sanctioned budget and year-wise expenditure for the highway work described",
      "work order, contractor name, and agreement for the stretch described",
      "quality inspection reports and delay-penalty records for the work",
      "file notings on repair or maintenance of the stretch",
    ],
    body: "National Highways Authority of India (NHAI)",
  },
  {
    test: /\b(road|sadak|सड़क|सडक|street|lane)\b/i,
    records: [
      "sanctioned budget and expenditure records for the road work described",
      "work order and contractor agreement for the road described",
      "quality inspection reports submitted for the work",
      "file notings on the complaint or repair request",
    ],
  },
  {
    test: /\b(passport|visa|rpo|tatkaal|tatkal passport|पासपोर्ट)\b/i,
    records: [
      "the passport application file and status history for the application described",
      "police verification report and dates recorded on the file",
      "prescribed processing timelines and file notings on delay",
    ],
    body: "MEA - Consular, Passport & Visa Division (CPV)",
  },
  {
    test: /\b(epfo|provident fund|\bpf\b|uan|epf|भविष्य निधि|पीएफ)\b/i,
    records: [
      "passbook / contribution records for the PF account described",
      "claim or transfer application and its processing notings",
      "rules and circulars applied to the claim",
    ],
    body: "Employees Provident Fund Organisation",
  },
  {
    test: /\b(income tax|pancard|pan card|\bitr\b|\btds\b|tax refund|इनकम टैक्स|पैन)\b/i,
    records: [
      "assessment records and notices issued for the PAN / period described",
      "refund processing file notings",
      "rules applied to the assessment or refund",
    ],
    body: "Central Board of Direct Taxes",
  },
  {
    test: /\b(aadhaar|aadhar|uidai|आधार)\b/i,
    records: [
      "enrolment or update request file for the Aadhaar described",
      "status history and file notings on the request",
      "prescribed timelines and circulars applied",
    ],
    body: "Unique Identification Authority of India",
  },
  {
    test: /\b(railway|train|station|pnr|irctc|रेल|ट्रेन)\b/i,
    records: [
      "records relating to the railway service or booking described",
      "file notings and official correspondence on the matter",
      "rules, circulars, or refund orders applied",
    ],
    body: "Ministry of Railways",
  },
  {
    test: /\b(gst|customs|excise|cgst|igst)\b/i,
    records: [
      "assessment or refund file for the GST / customs matter described",
      "notices and file notings on the case",
      "circulars applied to the decision",
    ],
    body: "Central Board of Indirect Taxes and Customs",
  },
  {
    test: /\b(bank|sbi|pnb|loan|account frozen|cheque|jan dhan)\b/i,
    records: [
      "records of the banking service complaint described",
      "file notings and instructions issued to the branch",
      "applicable scheme or RBI / DFS guidelines on file",
    ],
    body: "Department of Financial Services",
  },
  {
    test: /\b(neet|jee|cuet|nta|exam centre|omr|answer key)\b/i,
    records: [
      "exam administration records for the test and centre described",
      "answer-key / OMR handling records",
      "file notings on the grievance described",
    ],
    body: "National Testing Agency",
  },
  {
    test: /\b(cbse|marksheet|class 10|class 12|board exam)\b/i,
    records: [
      "evaluation and marksheet records for the examination described",
      "file notings on the correction or revaluation request",
      "rules applied to the request",
    ],
    body: "Central Board of Secondary Education",
  },
  {
    test: /\b(aiims|ayushman|pmjay|cghs)\b/i,
    records: [
      "patient or scheme records described, excluding exempt personal medical detail of third parties",
      "file notings on the appointment, claim, or facility described",
      "sanctioned budget and expenditure for the facility if that is the ask",
    ],
    body: "Ministry of Health & Family Welfare",
  },
  {
    test: /\b(lpg|ujjwala|gas agency|petrol pump)\b/i,
    records: [
      "allotment and distribution records for the LPG / fuel connection described",
      "dealer records and inspections on file",
      "scheme guidelines applied",
    ],
    body: "Ministry of Petroleum & Natural Gas",
  },
  {
    test: /\b(post office|speed post|parcel|india post)\b/i,
    records: [
      "tracking and delivery records for the article described",
      "inquiry file notings",
      "compensation rules applied",
    ],
    body: "Department of Posts",
  },
  {
    test: /\b(voter|election|evm|voter id|epic)\b/i,
    records: [
      "electoral roll entries for the locality described",
      "file notings on the addition, deletion, or correction request",
      "applicable instructions of the Election Commission",
    ],
    body: "Election Commission of India",
  },
];

const GENERIC_RECORDS = [
  "file notings and official correspondence relating to the matter described",
  "names and designations of the officials responsible for the matter described",
  "rules, guidelines, or orders on file that govern the matter described",
];

function unique(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function inferRecordsFromRant(transcript: string): string[] {
  const hits: string[] = [];
  for (const pattern of PATTERNS) {
    if (pattern.test.test(transcript)) hits.push(...pattern.records);
  }
  if (/(budget|fund|paisa|पैसा|बजट|kharch|खर्च|money|amount)/i.test(transcript) && !hits.some((h) => /budget/i.test(h))) {
    hits.unshift("sanctioned budget and expenditure records for the work described");
  }
  if (/(contract|theka|ठेका|contractor|ठेकेदार)/i.test(transcript) && !hits.some((h) => /work order|contractor/i.test(h))) {
    hits.push("the work order and contractor agreement for the work described");
  }
  if (/(inspection|quality|जांच|जाँच)/i.test(transcript) && !hits.some((h) => /inspection/i.test(h))) {
    hits.push("quality inspection reports submitted for the work described");
  }
  const merged = unique([...hits, ...GENERIC_RECORDS]);
  return merged.slice(0, 6);
}

export function inferBodyHint(transcript: string): string | null {
  for (const pattern of PATTERNS) {
    if (pattern.body && pattern.test.test(transcript)) return pattern.body;
  }
  const { results, reviewRequired } = searchDirectory(transcript, 1);
  if (!reviewRequired && results[0]) return results[0].pa.name;
  return null;
}

export function inferDateRange(transcript: string): string | null {
  const months = "January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec";
  const monthSpan = transcript.match(new RegExp(`\\b(${months})\\s*(?:to|through|till|until|[-–—])\\s*(${months})(?:\\s+(?:of\\s+)?)?(20\\d{2})?\\b`, "i"));
  if (monthSpan) {
    const year = monthSpan[3] || transcript.match(/\b20\d{2}\b/)?.[0];
    return `${monthSpan[1]}-${monthSpan[2]}${year ? ` ${year}` : ""}`;
  }
  const span = transcript.match(
    /\b((?:last|past|previous|since|from|for)\s+(?:the\s+)?(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|a few)?\s*(?:month|months|mahine|महीने|year|years|saal|साल|week|weeks|day|days|din|दिन)s?|\d+\s+(?:month|months|mahine|महीने|year|years|saal|साल)s?)\b/i
  );
  if (span) return span[1].replace(/\s+/g, " ").trim();
  if (/\b(20\d{2})\b/.test(transcript)) {
    const years = [...transcript.matchAll(/\b(20\d{2})\b/g)].map((m) => m[1]);
    if (years.length === 1) return years[0];
    if (years.length >= 2) return `${years[0]}–${years[years.length - 1]}`;
  }
  return null;
}

export function inferPlace(transcript: string): string | null {
  if (/\b(mumbai\s*[-–—]?\s*pune|pune\s*[-–—]?\s*mumbai)\b/i.test(transcript)) {
    return "Mumbai-Pune Expressway";
  }
  const sector = transcript.match(/\b(sector\s*\d+[A-Za-z]?)\b/i);
  if (sector) return sector[1];
  const labeled = transcript.match(
    /\b(?:in|at|near|from)\s+([A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*){0,3}(?:\s+\d+)?)/
  );
  if (labeled) {
    const place = labeled[1].trim();
    if (!/^(The|This|That|My|Our|A|An|January|February|March|April|May|June|July|August|September|October|November|December)$/i.test(place)) {
      return place;
    }
  }
  return null;
}

export function inferFormat(transcript: string): NotesLike["format"] {
  if (/\binspect/i.test(transcript)) return "inspection";
  if (/\belectronic|email|pdf|soft copy/i.test(transcript)) return "electronic copies";
  if (/\bsample/i.test(transcript)) return "samples";
  return "certified copies";
}

export function routingQuery(input: {
  transcript?: string;
  notes: NotesLike;
  draft?: { title?: string; requests?: string[] } | null;
}): string {
  return [
    input.transcript ?? "",
    ...input.notes.records_sought,
    input.notes.body_hint ?? "",
    input.notes.place ?? "",
    input.draft?.title ?? "",
    ...(input.draft?.requests ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

const MUMBAI_PUNE_EXPRESSWAY = /\b(mumbai\s*[-–—]?\s*pune|pune\s*[-–—]?\s*mumbai)\b[\s\S]{0,50}\b(expressway|toll)|\b(expressway|toll)\b[\s\S]{0,50}\b(mumbai\s*[-–—]?\s*pune|pune\s*[-–—]?\s*mumbai)\b/i;
const NATIONAL_HIGHWAY = /\b(nhai|nh-?\d|national highway|highways?|राजमार्ग|हाईवे)\b/i;
const STATE_BODY = /\b(pwd|public works|municipal|nagar|panchayat|discom|jal board|corporation of|local body|collector|tehsil|mandal)\b/i;

/** Structured hints handed off by the live intake agent (already confirmed by the citizen). */
export interface IntakeHintsLike {
  summary?: string;
  place?: string | null;
  date_range?: string | null;
  authority_hint?: string | null;
  jurisdiction?: "central" | "state" | "unclear";
  state_name?: string | null;
  jurisdiction_note?: string | null;
}

export function normalizeNotes(transcript: string, notes: NotesLike, intake?: IntakeHintsLike): NotesLike {
  const inferred = inferRecordsFromRant(transcript);
  const fromModel = unique(notes.records_sought ?? []);
  const corridorMatter = MUMBAI_PUNE_EXPRESSWAY.test(transcript);
  const records = (
    corridorMatter
      ? unique([...inferred, ...fromModel])
      : fromModel.length >= 3
        ? fromModel
        : unique([...fromModel, ...inferred])
  ).slice(0, 6);
  const format = !notes.format || notes.format === "unspecified" ? inferFormat(transcript) : notes.format;
  let body = notes.body_hint || intake?.authority_hint?.trim() || inferBodyHint(transcript);

  /* ---------- jurisdiction, decided in code ---------- */
  // The citizen's own words plus anything the agent captured: a city named
  // only during the applicant-details part of the call still counts.
  const jurisdictionText = [transcript, intake?.place, intake?.state_name, intake?.authority_hint]
    .filter(Boolean)
    .join(" ");
  const verdict = classifyJurisdiction(jurisdictionText);

  let jurisdiction: "central" | "state" | "unclear" = verdict.level;
  let stateName = verdict.stateName ?? notes.state_name ?? intake?.state_name ?? null;
  let filingChannel: string | null = verdict.filingChannel;
  let reasons = [...verdict.reasons];

  // A confident agent verdict fills the gap when the text alone was unclear;
  // it can never override a deterministic verdict.
  if (jurisdiction === "unclear" && intake?.jurisdiction && intake.jurisdiction !== "unclear") {
    jurisdiction = intake.jurisdiction;
    if (intake.jurisdiction_note) reasons = [intake.jurisdiction_note];
  }

  if (verdict.level === "state" && verdict.recommendedBody) {
    // Never leave a Central department as the records holder for a ward matter.
    body = verdict.recommendedBody;
  }

  /*
   * The mirror image, and the bug this guards: the citizen named a Central
   * authority ("NHAI", "EPFO", "this is a central government matter") and the
   * model still proposed a municipal corporation as the records holder. A
   * named authority is the citizen's own statement about who holds the file,
   * so it overrides a State body the model guessed.
   */
  if (verdict.level === "central" && verdict.namedAuthority && verdict.recommendedBody) {
    if (!body || STATE_BODY.test(body)) body = verdict.recommendedBody;
  }

  const namedCentral = verdict.level === "central" && verdict.namedAuthority;

  if (corridorMatter && !namedCentral) {
    jurisdiction = "state";
    stateName = "Maharashtra";
    body = "Maharashtra State Road Development Corporation (MSRDC)";
    filingChannel = "Maharashtra State RTI channel";
    if (reasons.length === 0) {
      reasons = ["The Mumbai-Pune Expressway is operated by a Maharashtra State corporation, not a Central authority."];
    }
  } else if (NATIONAL_HIGHWAY.test(transcript) && verdict.level !== "state") {
    jurisdiction = "central";
    filingChannel = "RTI Online Central portal (rtionline.gov.in)";
    if (!body || STATE_BODY.test(body)) body = "National Highways Authority of India (NHAI)";
  }

  return {
    ...notes,
    records_sought: records.length ? records : inferred,
    date_range:
      (notes.date_range && notes.date_range !== "the period mentioned by the citizen" ? notes.date_range : null)
      || intake?.date_range?.trim()
      || inferDateRange(transcript),
    place: notes.place || intake?.place?.trim() || inferPlace(transcript),
    body_hint: body,
    format,
    missing_essentials: [],
    is_state_matter: jurisdiction === "state",
    state_name: stateName,
    jurisdiction,
    filing_channel: filingChannel,
    jurisdiction_reasons: reasons.slice(0, 6),
  };
}

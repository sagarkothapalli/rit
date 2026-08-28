import type { CaseType, Jurisdiction } from "@/lib/domain/status";
import type { FilingRuleSet } from "./schema";

const VERIFIED = "2026-08-28";
const GUIDELINES = "https://rtionline.gov.in/guidelines.php?request";
const MANUAL = "https://rtionline.gov.in/viewPDF.php?file=um_citizen.pdf";
const CIC = "https://dsscic.nic.in/online-appeal-application/appeal/index";

const CENTRAL_DEADLINES = {
  responseDays: 30,
  lifeLibertyHours: 48,
  thirdPartyDays: 40,
  transferDays: 5,
  firstAppealLimitationDays: 30,
  faaDecisionDays: 30,
  faaExtensionDays: 15,
  secondAppealLimitationDays: 90,
};

const CENTRAL_TEXT = {
  maxCharacters: 3000,
  allowedSource: "RTI Online guidelines, verified 2026-08-28",
  allowedDescription: "Letters, numbers, spaces, and , . - _ ( ) / @ : & ? \\ %",
};

const CENTRAL_ATTACHMENTS = {
  mimeTypes: ["application/pdf"],
  maxBytes: 1_000_000,
  maxCount: 3,
  filenameNoSpaces: true,
  pdfOnly: true,
};

export const CENTRAL_REQUEST_RULES: FilingRuleSet = {
  id: "rti-online-central/RTI_REQUEST/2024-06",
  destination: "rti-online-central",
  destinationLabel: "RTI Online (Central)",
  caseType: "RTI_REQUEST",
  effectiveFrom: "2013-01-01",
  verifiedAt: VERIFIED,
  sourceUrl: GUIDELINES,
  guidanceOnly: false,
  text: CENTRAL_TEXT,
  attachments: CENTRAL_ATTACHMENTS,
  applicant: { mobileRequired: true, phoneRequired: false, emailRequired: true },
  fee: { amountRupees: 10, bplExempt: true, payableOn: "the official RTI Online portal" },
  documents: { requiredKinds: [], bplProofRequiredIfClaimed: true, bplCollectCardDetails: true },
  deadlines: CENTRAL_DEADLINES,
  filingChannel: "RTI Online Central portal",
  portalUrl: "https://rtionline.gov.in/",
};

export const CENTRAL_FIRST_APPEAL_RULES: FilingRuleSet = {
  ...CENTRAL_REQUEST_RULES,
  id: "rti-online-central/FIRST_APPEAL/2024-06",
  caseType: "FIRST_APPEAL",
  destinationLabel: "RTI Online (Central) first appeal",
  sourceUrl: MANUAL,
  fee: { amountRupees: 0, bplExempt: true, payableOn: "No first-appeal fee on the Central portal" },
  documents: { requiredKinds: ["APPLICATION_PDF", "CPIO_REPLY"], bplProofRequiredIfClaimed: false, bplCollectCardDetails: false },
  filingChannel: "RTI Online Central portal — first appeal",
};

export const CIC_SECOND_APPEAL_RULES: FilingRuleSet = {
  ...CENTRAL_REQUEST_RULES,
  id: "cic/SECOND_APPEAL/2024-06",
  destination: "cic",
  destinationLabel: "Central Information Commission",
  caseType: "SECOND_APPEAL",
  sourceUrl: CIC,
  text: { ...CENTRAL_TEXT, maxCharacters: 12000 },
  attachments: { mimeTypes: ["application/pdf"], maxBytes: 5_000_000, maxCount: 12, filenameNoSpaces: true, pdfOnly: true },
  fee: { amountRupees: 0, bplExempt: true, payableOn: "No second-appeal fee at the Commission in this rule set" },
  documents: { requiredKinds: ["APPLICATION_PDF", "FIRST_APPEAL", "FAA_ORDER"], bplProofRequiredIfClaimed: false, bplCollectCardDetails: false },
  filingChannel: "Central Information Commission",
  portalUrl: CIC,
};

export const CIC_COMPLAINT_RULES: FilingRuleSet = {
  ...CIC_SECOND_APPEAL_RULES,
  id: "cic/SECTION_18_COMPLAINT/2024-06",
  caseType: "SECTION_18_COMPLAINT",
  destinationLabel: "Central Information Commission — Section 18 complaint",
  filingChannel: "Central Information Commission (Section 18)",
};

export const STATE_GUIDANCE_RULES: FilingRuleSet = {
  ...CENTRAL_REQUEST_RULES,
  id: "guidance/STATE/2024-06",
  destination: "state-guidance",
  destinationLabel: "State or local channel (guidance only)",
  guidanceOnly: true,
  text: { ...CENTRAL_TEXT, maxCharacters: 12000 },
  attachments: { mimeTypes: ["application/pdf"], maxBytes: 5_000_000, maxCount: 8, filenameNoSpaces: false, pdfOnly: false },
  applicant: { mobileRequired: false, phoneRequired: false, emailRequired: true },
  fee: { amountRupees: 10, bplExempt: true, payableOn: "the State RTI rules that apply to this authority" },
  filingChannel: "State or local RTI channel — not RTI Online",
  portalUrl: null,
};

export const GUIDANCE_ONLY_RULES: FilingRuleSet = {
  ...CENTRAL_REQUEST_RULES,
  id: "guidance/UNKNOWN/2024-06",
  destination: "guidance",
  destinationLabel: "Guidance only — destination not confirmed",
  guidanceOnly: true,
  filingChannel: "Confirm the filing channel before you file",
  portalUrl: null,
};

const ALL = [
  CENTRAL_REQUEST_RULES,
  CENTRAL_FIRST_APPEAL_RULES,
  CIC_SECOND_APPEAL_RULES,
  CIC_COMPLAINT_RULES,
  STATE_GUIDANCE_RULES,
  GUIDANCE_ONLY_RULES,
];

export function filingRulesFor(input: { caseType: CaseType; jurisdiction: Jurisdiction; onlineCentral?: boolean }): FilingRuleSet {
  const { caseType, jurisdiction, onlineCentral = true } = input;
  if (jurisdiction === "STATE") return { ...STATE_GUIDANCE_RULES, caseType };
  if (caseType === "RTI_REQUEST") return onlineCentral && jurisdiction === "CENTRAL" ? CENTRAL_REQUEST_RULES : GUIDANCE_ONLY_RULES;
  if (caseType === "FIRST_APPEAL") {
    return jurisdiction === "CENTRAL" && onlineCentral
      ? CENTRAL_FIRST_APPEAL_RULES
      : { ...STATE_GUIDANCE_RULES, caseType, destinationLabel: "State first-appeal channel (guidance only)" };
  }
  if (caseType === "SECOND_APPEAL") {
    return jurisdiction === "CENTRAL"
      ? CIC_SECOND_APPEAL_RULES
      : { ...STATE_GUIDANCE_RULES, caseType, destination: "sic", destinationLabel: "State Information Commission (guidance only)", filingChannel: "State Information Commission" };
  }
  return jurisdiction === "CENTRAL"
    ? CIC_COMPLAINT_RULES
    : { ...STATE_GUIDANCE_RULES, caseType, destination: "sic", destinationLabel: "State Information Commission — Section 18 (guidance only)" };
}

export function publicFilingRules(): FilingRuleSet[] {
  return ALL;
}

import type { CaseType } from "@/lib/domain/status";

export interface FilingRuleSet {
  id: string;
  destination: string;
  destinationLabel: string;
  caseType: CaseType;
  effectiveFrom: string;
  verifiedAt: string;
  sourceUrl: string;
  guidanceOnly: boolean;
  text: { maxCharacters: number; allowedSource: string; allowedDescription: string };
  attachments: { mimeTypes: string[]; maxBytes: number; maxCount: number; filenameNoSpaces: boolean; pdfOnly: boolean };
  applicant: { mobileRequired: boolean; phoneRequired: boolean; emailRequired: boolean };
  fee: { amountRupees: number; bplExempt: boolean; payableOn: string };
  documents: { requiredKinds: string[]; bplProofRequiredIfClaimed: boolean; bplCollectCardDetails: boolean };
  deadlines: {
    responseDays: number;
    lifeLibertyHours: number;
    thirdPartyDays: number;
    transferDays: number;
    firstAppealLimitationDays: number;
    faaDecisionDays: number;
    faaExtensionDays: number;
    secondAppealLimitationDays: number;
  };
  filingChannel: string;
  portalUrl: string | null;
}

export const PORTAL_DISALLOWED = /[^A-Za-z0-9\s,.\-_()/@:&?\\%]/g;

export function disallowedInText(text: string): string[] {
  const found = text.match(PORTAL_DISALLOWED);
  return found ? [...new Set(found)].slice(0, 16) : [];
}

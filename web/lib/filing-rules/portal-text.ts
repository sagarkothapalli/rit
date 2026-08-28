import { disallowedInText, type FilingRuleSet } from "./schema";

export function coveringStatement(title: string): string {
  const subject = title.trim() || "the information sought";
  return (
    `The complete request for ${subject} is enclosed as a supporting PDF, because it exceeds the portal text limit. `
    + "Please treat that attachment as the request under Section 6(1) of the RTI Act, 2005."
  );
}

export function preparePortalText(fullText: string, rules: FilingRuleSet): {
  portalText: string;
  needsAttachment: boolean;
  overLimit: boolean;
  disallowed: string[];
} {
  const disallowed = disallowedInText(fullText);
  const overLimit = fullText.length > rules.text.maxCharacters;
  const needsAttachment = overLimit || disallowed.length > 0;
  if (!needsAttachment) {
    return { portalText: fullText, needsAttachment: false, overLimit, disallowed };
  }
  return {
    portalText: coveringStatement("the records requested"),
    needsAttachment: true,
    overLimit,
    disallowed,
  };
}

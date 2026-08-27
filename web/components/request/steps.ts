/* ============================================================
   Shared vocabulary for the drafting workspace.

   The step names follow the RTI process as a citizen encounters
   it — "Records sought", "Public authority", "Acknowledgement" —
   not the internal gate names.
   ============================================================ */

export type Step =
  | "language"
  | "describe"
  | "request"
  | "eligibility"
  | "application"
  | "authority"
  | "applicant"
  | "review"
  | "acknowledgement";

export interface StepMeta {
  id: Step;
  label: string;
  caption: string;
}

export const STEPS: StepMeta[] = [
  { id: "language", label: "Language", caption: "How you want to tell us" },
  { id: "describe", label: "Your concern", caption: "Say or type what happened" },
  { id: "request", label: "Records sought", caption: "What the application asks for" },
  { id: "eligibility", label: "Eligibility", caption: "Exemption and jurisdiction check" },
  { id: "application", label: "Application", caption: "The text the authority receives" },
  { id: "authority", label: "Public authority", caption: "Who holds these records" },
  { id: "applicant", label: "Your details", caption: "Particulars the form requires" },
  { id: "review", label: "Review", caption: "The application as a PDF" },
  { id: "acknowledgement", label: "Acknowledgement", caption: "Your saved copy" },
];

export const STEP_IDS: Step[] = STEPS.map((step) => step.id);

export interface LanguageOption {
  code: string;
  label: string;
  native: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: "en-IN", label: "English", native: "English" },
  { code: "hi-IN", label: "Hindi", native: "हिन्दी" },
  { code: "ta-IN", label: "Tamil", native: "தமிழ்" },
  { code: "te-IN", label: "Telugu", native: "తెలుగు" },
  { code: "bn-IN", label: "Bengali", native: "বাংলা" },
  { code: "mr-IN", label: "Marathi", native: "मराठी" },
  { code: "gu-IN", label: "Gujarati", native: "ગુજરાતી" },
  { code: "kn-IN", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml-IN", label: "Malayalam", native: "മലയാളം" },
  { code: "pa-IN", label: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "or-IN", label: "Odia", native: "ଓଡ଼ିଆ" },
  { code: "ur-IN", label: "Urdu", native: "اردو" },
];

export function languageLabel(code: string): string {
  const found = LANGUAGES.find((language) => language.code === code);
  if (!found) return "English";
  return found.label === found.native ? found.label : `${found.native} (${found.label})`;
}

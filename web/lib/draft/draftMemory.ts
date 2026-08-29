import type { Step } from "@/components/request/steps";
import type { Notes, Guard, Draft } from "@/lib/cage/schemas";
import type { PublicAuthority } from "@/lib/retrieval";
import type { ApplicantDetails } from "@/lib/applicant";
import type { PhotoEvidenceItem } from "@/lib/evidence/photos";
import type { IntakeHandoff } from "@/lib/live/intakePrompt";
import { INTAKE_STORAGE_KEY } from "@/lib/live/intakeMemory";
import type { ComplaintDraftPayload, Jurisdiction } from "@/lib/domain/case";

/* ============================================================
   Draft snapshot & cache management.
   Persists active draft state across page refreshes so that
   the user is asked whether to continue or start fresh,
   without automatically pulling them in or using redirect tokens.
   ============================================================ */

export const WIZARD_DRAFT_KEY = "praja-wizard-draft";
export const SECTION18_DRAFT_KEY = "praja-section18-draft";

export interface RetrievedCandidate {
  id: string;
  name: string;
  ministry: string;
  matched: string[];
  score: number;
  jurisdiction?: "central" | "state";
  directory_status?: "official-central-snapshot" | "curated-jurisdiction-rule";
  filing_channel?: string;
}

export interface WizardDraftSnapshot {
  step: Step;
  lang: string;
  intakeMode: "assistant" | "manual" | null;
  manualText: string;
  userCorrected: boolean;
  transcript: string;
  notes: Notes | null;
  guard: Guard | null;
  draft: Draft | null;
  candidates: Array<{ id: string; why: string; caveat: string }>;
  retrieved: RetrievedCandidate[];
  reviewRequired: boolean;
  picked: string | null;
  manualAuthority: PublicAuthority | null;
  applicant: ApplicantDetails;
  prefilled: Array<keyof ApplicantDetails>;
  emailVerified: boolean;
  photos: PhotoEvidenceItem[];
  useTextAttachment: boolean;
  handoff?: IntakeHandoff | null;
  capturedAt: number;
}

export interface Section18DraftSnapshot {
  draft: ComplaintDraftPayload;
  jurisdiction: Jurisdiction;
  applicant: ApplicantDetails;
  capturedAt: number;
}

export function saveWizardDraft(snapshot: Omit<WizardDraftSnapshot, "capturedAt">): void {
  try {
    const payload: WizardDraftSnapshot = {
      ...snapshot,
      capturedAt: Date.now(),
    };
    sessionStorage.setItem(WIZARD_DRAFT_KEY, JSON.stringify(payload));
  } catch {
    /* storage may be unavailable in private browsing */
  }
}

export function loadWizardDraft(): WizardDraftSnapshot | null {
  try {
    const raw = sessionStorage.getItem(WIZARD_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WizardDraftSnapshot> | null;
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.step) return null;
    return parsed as WizardDraftSnapshot;
  } catch {
    return null;
  }
}

export function clearWizardDraft(): void {
  try {
    sessionStorage.removeItem(WIZARD_DRAFT_KEY);
  } catch {
    /* noop */
  }
}

export function saveSection18Draft(snapshot: Omit<Section18DraftSnapshot, "capturedAt">): void {
  try {
    const payload: Section18DraftSnapshot = {
      ...snapshot,
      capturedAt: Date.now(),
    };
    sessionStorage.setItem(SECTION18_DRAFT_KEY, JSON.stringify(payload));
  } catch {
    /* storage may be unavailable */
  }
}

export function loadSection18Draft(): Section18DraftSnapshot | null {
  try {
    const raw = sessionStorage.getItem(SECTION18_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Section18DraftSnapshot> | null;
    if (!parsed || typeof parsed !== "object" || !parsed.draft) return null;
    return parsed as Section18DraftSnapshot;
  } catch {
    return null;
  }
}

export function clearSection18Draft(): void {
  try {
    sessionStorage.removeItem(SECTION18_DRAFT_KEY);
  } catch {
    /* noop */
  }
}

/**
 * Clears all draft and intake storage / cache completely.
 * Called whenever a user chooses "Make a New Complaint / Start Fresh" or finishes an application.
 */
export function clearAllDraftAndIntakeCache(): void {
  try {
    sessionStorage.removeItem(WIZARD_DRAFT_KEY);
    sessionStorage.removeItem(INTAKE_STORAGE_KEY);
    sessionStorage.removeItem(SECTION18_DRAFT_KEY);
  } catch {
    /* noop */
  }
}

/** Check whether a saved wizard draft has meaningful content worth asking to restore. */
export function hasSubstantialWizardDraft(snapshot: WizardDraftSnapshot | null): boolean {
  if (!snapshot) return false;
  if (snapshot.step !== "language") return true;
  if (snapshot.transcript && snapshot.transcript.trim().length >= 10) return true;
  if (snapshot.manualText && snapshot.manualText.trim().length >= 10) return true;
  if (snapshot.notes !== null || snapshot.draft !== null) return true;
  if (snapshot.handoff && (snapshot.handoff.summary.trim().length >= 10 || snapshot.handoff.place)) return true;
  return false;
}

/** Check whether a Section 18 draft has meaningful content. */
export function hasSubstantialSection18Draft(snapshot: Section18DraftSnapshot | null): boolean {
  if (!snapshot) return false;
  const d = snapshot.draft;
  if (!d) return false;
  if (d.facts && d.facts.trim().length >= 10) return true;
  if (d.relief && d.relief.trim().length >= 5) return true;
  if (d.chronology && d.chronology.trim().length >= 5) return true;
  if (d.ground !== "NO_RESPONSE") return true;
  if (snapshot.applicant.name || snapshot.applicant.email) return true;
  return false;
}

/** Extract a human-readable snippet for the resume prompt. */
export function getWizardDraftSnippet(snapshot: WizardDraftSnapshot): string {
  if (snapshot.draft?.title) return snapshot.draft.title;
  if (snapshot.notes?.records_sought && snapshot.notes.records_sought.length > 0) {
    return snapshot.notes.records_sought[0];
  }
  if (snapshot.transcript) return snapshot.transcript;
  if (snapshot.manualText) return snapshot.manualText;
  if (snapshot.handoff?.summary) return snapshot.handoff.summary;
  return "Draft RTI application in progress";
}

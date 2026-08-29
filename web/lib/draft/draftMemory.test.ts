import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAllDraftAndIntakeCache,
  clearSection18Draft,
  clearWizardDraft,
  getWizardDraftSnippet,
  hasSubstantialSection18Draft,
  hasSubstantialWizardDraft,
  loadSection18Draft,
  loadWizardDraft,
  saveSection18Draft,
  saveWizardDraft,
  SECTION18_DRAFT_KEY,
  WIZARD_DRAFT_KEY,
  type Section18DraftSnapshot,
  type WizardDraftSnapshot,
} from "./draftMemory";
import { INTAKE_STORAGE_KEY } from "@/lib/live/intakeMemory";
import { emptyApplicant } from "@/lib/applicant";
import { emptyComplaintDraft } from "@/lib/storage/factory";

class MockStorage implements Storage {
  private store: Record<string, string> = {};
  get length(): number {
    return Object.keys(this.store).length;
  }
  clear(): void {
    this.store = {};
  }
  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }
  key(index: number): string | null {
    return Object.keys(this.store)[index] ?? null;
  }
  removeItem(key: string): void {
    delete this.store[key];
  }
  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }
}

describe("draftMemory", () => {
  beforeEach(() => {
    (globalThis as unknown as { sessionStorage: Storage }).sessionStorage = new MockStorage();
  });

  it("saves and loads wizard draft snapshot", () => {
    const snapshot: Omit<WizardDraftSnapshot, "capturedAt"> = {
      step: "describe",
      lang: "hi-IN",
      intakeMode: "manual",
      manualText: "Road repairs not done in colony for 6 months",
      userCorrected: true,
      transcript: "Road repairs not done in colony for 6 months",
      notes: null,
      guard: null,
      draft: null,
      candidates: [],
      retrieved: [],
      reviewRequired: false,
      picked: null,
      manualAuthority: null,
      applicant: emptyApplicant(),
      prefilled: [],
      emailVerified: false,
      photos: [],
      useTextAttachment: false,
    };

    saveWizardDraft(snapshot);
    const loaded = loadWizardDraft();
    expect(loaded).not.toBeNull();
    expect(loaded?.step).toBe("describe");
    expect(loaded?.lang).toBe("hi-IN");
    expect(loaded?.transcript).toBe("Road repairs not done in colony for 6 months");
    expect(loaded?.capturedAt).toBeGreaterThan(0);
  });

  it("clears wizard draft", () => {
    saveWizardDraft({
      step: "request",
      lang: "en-IN",
      intakeMode: "assistant",
      manualText: "",
      userCorrected: false,
      transcript: "Testing clearing",
      notes: null,
      guard: null,
      draft: null,
      candidates: [],
      retrieved: [],
      reviewRequired: false,
      picked: null,
      manualAuthority: null,
      applicant: emptyApplicant(),
      prefilled: [],
      emailVerified: false,
      photos: [],
      useTextAttachment: false,
    });
    expect(sessionStorage.getItem(WIZARD_DRAFT_KEY)).not.toBeNull();
    clearWizardDraft();
    expect(loadWizardDraft()).toBeNull();
  });

  it("clears all draft and intake cache", () => {
    sessionStorage.setItem(WIZARD_DRAFT_KEY, JSON.stringify({ step: "describe" }));
    sessionStorage.setItem(INTAKE_STORAGE_KEY, JSON.stringify({ transcript: "test" }));
    sessionStorage.setItem(SECTION18_DRAFT_KEY, JSON.stringify({ draft: {} }));

    clearAllDraftAndIntakeCache();

    expect(sessionStorage.getItem(WIZARD_DRAFT_KEY)).toBeNull();
    expect(sessionStorage.getItem(INTAKE_STORAGE_KEY)).toBeNull();
    expect(sessionStorage.getItem(SECTION18_DRAFT_KEY)).toBeNull();
  });

  it("detects substantial wizard draft correctly", () => {
    expect(hasSubstantialWizardDraft(null)).toBe(false);

    // Empty language step
    const emptyDraft: WizardDraftSnapshot = {
      step: "language",
      lang: "en-IN",
      intakeMode: null,
      manualText: "",
      userCorrected: false,
      transcript: "",
      notes: null,
      guard: null,
      draft: null,
      candidates: [],
      retrieved: [],
      reviewRequired: false,
      picked: null,
      manualAuthority: null,
      applicant: emptyApplicant(),
      prefilled: [],
      emailVerified: false,
      photos: [],
      useTextAttachment: false,
      capturedAt: Date.now(),
    };
    expect(hasSubstantialWizardDraft(emptyDraft)).toBe(false);

    // Later step
    expect(hasSubstantialWizardDraft({ ...emptyDraft, step: "request" })).toBe(true);

    // Substantial transcript in language/describe
    expect(
      hasSubstantialWizardDraft({
        ...emptyDraft,
        transcript: "Water pipeline leakage issue reported last year",
      })
    ).toBe(true);
  });

  it("saves and loads Section 18 draft snapshot", () => {
    const draft = emptyComplaintDraft();
    draft.facts = "PIO refused to accept the RTI application without justification.";
    draft.ground = "REFUSED_ACCESS";

    const snapshot: Omit<Section18DraftSnapshot, "capturedAt"> = {
      draft,
      jurisdiction: "CENTRAL",
      applicant: { ...emptyApplicant(), name: "Rajesh Kumar" },
    };

    saveSection18Draft(snapshot);
    const loaded = loadSection18Draft();
    expect(loaded).not.toBeNull();
    expect(loaded?.draft.facts).toContain("PIO refused to accept");
    expect(loaded?.jurisdiction).toBe("CENTRAL");
    expect(loaded?.applicant.name).toBe("Rajesh Kumar");

    expect(hasSubstantialSection18Draft(loaded)).toBe(true);

    clearSection18Draft();
    expect(loadSection18Draft()).toBeNull();
  });

  it("extracts readable snippet", () => {
    const snapshot: WizardDraftSnapshot = {
      step: "application",
      lang: "en-IN",
      intakeMode: null,
      manualText: "",
      userCorrected: false,
      transcript: "Road work not completed",
      notes: null,
      guard: null,
      draft: {
        title: "Road construction files for Sector 4",
        requests: ["Request 1 with sufficient characters", "Request 2 with sufficient characters", "Request 3 with sufficient characters"],
        background: "Roads",
      },
      candidates: [],
      retrieved: [],
      reviewRequired: false,
      picked: null,
      manualAuthority: null,
      applicant: emptyApplicant(),
      prefilled: [],
      emailVerified: false,
      photos: [],
      useTextAttachment: false,
      capturedAt: Date.now(),
    };

    expect(getWizardDraftSnippet(snapshot)).toBe("Road construction files for Sector 4");
  });
});

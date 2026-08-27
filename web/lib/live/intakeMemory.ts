import type { IntakeHandoff } from "./intakePrompt";

/* ============================================================
   Intake memory. The handoff record persists in sessionStorage
   so a page refresh mid-flow never loses the complaint the
   agent captured. Cleared when a new session starts over.
   ============================================================ */

export const INTAKE_STORAGE_KEY = "praja-intake";

export interface IntakeRecord {
  handoff: IntakeHandoff;
  transcript: string;
  capturedAt: number;
}

export function saveIntakeRecord(record: IntakeRecord): void {
  try {
    sessionStorage.setItem(INTAKE_STORAGE_KEY, JSON.stringify(record));
  } catch {
    /* storage may be unavailable (private mode) — session still works */
  }
}

export function loadIntakeRecord(): IntakeRecord | null {
  try {
    const raw = sessionStorage.getItem(INTAKE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<IntakeRecord> | null;
    if (!parsed || typeof parsed !== "object" || !parsed.handoff) return null;
    return {
      handoff: parsed.handoff as IntakeHandoff,
      transcript: typeof parsed.transcript === "string" ? parsed.transcript : "",
      capturedAt: typeof parsed.capturedAt === "number" ? parsed.capturedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function clearIntakeRecord(): void {
  try {
    sessionStorage.removeItem(INTAKE_STORAGE_KEY);
  } catch {
    /* noop */
  }
}

/** Compose the text sent to GATE 1: the agent's confirmed summary first, raw speech after. */
export function composeIntakeTranscript(handoff: IntakeHandoff, userText: string): string {
  const spoken = userText.trim().slice(0, 6000);
  const summary = handoff.summary.trim();
  if (summary && spoken) return `${summary} — ${spoken}`.slice(0, 6000);
  return (spoken || summary).slice(0, 6000);
}

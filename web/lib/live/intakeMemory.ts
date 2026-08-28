import { normalizeHandoff, type IntakeHandoff } from "./intakePrompt";

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
      // Re-normalise: a record written by an earlier build may predate the
      // applicant fields, and stored JSON is not a trusted shape.
      handoff: rehydrate(parsed.handoff),
      transcript: typeof parsed.transcript === "string" ? parsed.transcript : "",
      capturedAt: typeof parsed.capturedAt === "number" ? parsed.capturedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

/** Flatten a stored handoff back into the tool-call shape normalizeHandoff expects. */
function rehydrate(stored: IntakeHandoff): IntakeHandoff {
  const applicant = stored.applicant ?? {};
  return normalizeHandoff({
    detected_lang: stored.detected_lang,
    summary: stored.summary,
    jurisdiction: stored.jurisdiction,
    state_name: stored.state_name,
    jurisdiction_note: stored.jurisdiction_note,
    place: stored.place,
    date_range: stored.date_range,
    authority_hint: stored.authority_hint,
    applicant_name: applicant.name,
    gender: applicant.gender,
    address: applicant.address,
    pincode: applicant.pincode,
    state: applicant.state,
    area_status: applicant.areaStatus,
    educational_status: applicant.educationalStatus,
    mobile: applicant.mobile,
    phone: applicant.phone,
    email: applicant.email,
    is_bpl: applicant.isBpl,
  });
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
  if (!summary || !spoken) return (spoken || summary).slice(0, 6000);
  // A synthesised handoff derives its summary from the transcript itself, so
  // prefixing it would just repeat the citizen's words back at the gate.
  const head = summary.replace(/…$/, "").trim();
  if (head && spoken.startsWith(head)) return spoken;
  return `${summary} — ${spoken}`.slice(0, 6000);
}

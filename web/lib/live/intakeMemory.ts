import type { IntakeHandoff } from "./intakePrompt";

/* ============================================================
   Intake helpers.
   Composes the intake transcript from handoff and speech.
   Nothing is persisted across sessions or page refreshes.
   ============================================================ */

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

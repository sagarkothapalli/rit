"use client";

import { STEPS, type Step } from "./steps";

/* ============================================================
   Step rail. Completed steps are clickable so a citizen can go
   back and change an answer; steps ahead are not, because the
   data to fill them does not exist yet.
   ============================================================ */

export default function StepBar({
  current,
  index,
  onJump,
}: {
  current: Step;
  index: number;
  onJump: (step: Step) => void;
}) {
  return (
    <nav className="step-bar" aria-label="Application progress">
      <ol className="site-container step-bar-inner">
        {STEPS.map((step, position) => {
          const active = step.id === current;
          const done = position < index;
          const state = active ? "is-active" : done ? "is-done" : "is-ahead";
          return (
            <li key={step.id} className={`step-chip ${state}`}>
              {done ? (
                <button type="button" onClick={() => onJump(step.id)}>
                  <span className="step-number">{position + 1}</span>
                  <span className="step-label">{step.label}</span>
                </button>
              ) : (
                <span aria-current={active ? "step" : undefined}>
                  <span className="step-number">{position + 1}</span>
                  <span className="step-label">{step.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

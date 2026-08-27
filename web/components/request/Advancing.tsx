"use client";

/** Shown while the intake handoff runs the records gate. */
export default function Advancing() {
  return (
    <div className="step-body">
      <h1>We have your concern.</h1>
      <p className="step-lede">
        Sorting out the period, the place, the records to ask for, and who is likely to hold them.
      </p>
      <div className="working-strip" role="status">
        <span className="working-dot" aria-hidden="true" />
        Preparing what the application will ask for
      </div>
    </div>
  );
}

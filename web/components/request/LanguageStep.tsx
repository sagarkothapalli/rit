"use client";

import type { JurisdictionVerdict } from "@/lib/jurisdiction";
import { LANGUAGES } from "./steps";

/* ============================================================
   Step 1. Two clearly separated ways in:

     - Talk to the RTI agent. It works out the language by ear,
       so no picker is needed first.
     - Type it yourself. Then the language matters, so the picker
       belongs to that path.

   No model or vendor name appears anywhere. The citizen is
   choosing a way to talk, not a technology.
   ============================================================ */

interface LiveLike {
  status: string;
  agentText: string;
  userText: string;
  error: string | null;
  jurisdiction: JurisdictionVerdict | null;
  canFinish: boolean;
  start: () => void | Promise<void>;
  stop: () => void;
  /** Ends the intake and hands off immediately. Returns false if too little was said. */
  finish: () => boolean;
}

interface LanguageStepProps {
  lang: string;
  setLang: (code: string) => void;
  liveReady: boolean;
  live: LiveLike;
  speechSupported: boolean;
  onManual: () => void;
  onReviewSpoken: () => void;
}

export default function LanguageStep({
  lang,
  setLang,
  liveReady,
  live,
  speechSupported,
  onManual,
  onReviewSpoken,
}: LanguageStepProps) {
  const talking = live.status === "connecting" || live.status === "active" || live.status === "wrapup";
  const finished = live.status === "ended" || live.status === "done";

  return (
    <div className="step-body">
      <h1>How would you like to tell us?</h1>
      <p className="step-lede">
        Describe the problem in your own words — a complaint, a delay, or half a thought is enough. You will see
        everything in writing before anything is prepared.
      </p>

      {liveReady && (
        <section className="intake-option is-primary">
          <div className="intake-option-head">
            <h2>Speak to the RTI agent</h2>
            <p>
              A guided conversation in your own language. It listens, asks at most a few short questions, and fills
              in the form details with you. You can interrupt at any time.
            </p>
          </div>

          {talking ? (
            <div className="intake-live">
              <div className="intake-live-status" role="status">
                <span className="working-dot" aria-hidden="true" />
                {live.status === "connecting"
                  ? "Connecting…"
                  : live.status === "wrapup"
                    ? "Wrapping up…"
                    : "Listening. Speak naturally."}
                <button type="button" className="link-button" onClick={live.stop}>End conversation</button>
              </div>
              <div className="intake-transcript" aria-live="polite">
                {live.agentText && <p className="intake-agent">RTI agent: {live.agentText}</p>}
                {live.userText ? (
                  <p className="intake-user">You: {live.userText}</p>
                ) : (
                  <p className="intake-placeholder">Your words will appear here as you speak.</p>
                )}
              </div>

              {/* Saying "that's it" is enough, but the citizen never has to
                  depend on the agent hearing it to move forward. */}
              {live.canFinish && (
                <div className="intake-finish">
                  <button type="button" className="primary-button" onClick={() => live.finish()}>
                    That&rsquo;s it — prepare my application
                  </button>
                  <p className="step-hint">
                    Saying &ldquo;that&rsquo;s it&rdquo; or &ldquo;proceed&rdquo; does the same thing. Anything still
                    missing you can fill in on the next screens.
                  </p>
                </div>
              )}

              {/* Surfaced live, so the citizen sees the jurisdiction call as
                  soon as it is made rather than two steps later. */}
              {live.jurisdiction?.level === "state" && (
                <p className="intake-jurisdiction">
                  This looks like a{" "}
                  {live.jurisdiction.stateName ? `${live.jurisdiction.stateName} State` : "State"} or local body
                  matter
                  {live.jurisdiction.localBody ? <> — likely {live.jurisdiction.localBody.short}</> : null}. The
                  Central portal cannot accept it, and the RTI agent will explain what to do instead.
                </p>
              )}
            </div>
          ) : (
            <div className="intake-actions">
              <button type="button" className="primary-button" onClick={() => void live.start()}>
                Talk to the RTI agent
              </button>
              <button type="button" className="secondary-button" onClick={onManual}>
                Manual entry
              </button>
              {finished && live.userText.trim() && (
                <button type="button" className="link-button" onClick={onReviewSpoken}>
                  Review what I said
                </button>
              )}
            </div>
          )}

          {live.error && <p className="step-error" role="alert">{live.error}</p>}
        </section>
      )}

      <section className="intake-option">
        <div className="intake-option-head">
          <h2>Type it yourself</h2>
          <p>
            Write the problem in your own words instead. You will enter your name, address, and contact details in
            a later step.
          </p>
        </div>

        <fieldset className="language-picker">
          <legend>Which language will you write in?</legend>
          <div className="language-grid">
            {LANGUAGES.map((language) => (
              <label key={language.code} className={lang === language.code ? "is-selected" : ""}>
                <input
                  type="radio"
                  name="intake-language"
                  value={language.code}
                  checked={lang === language.code}
                  onChange={() => setLang(language.code)}
                />
                <span className="language-native" lang={language.code.slice(0, 2)}>{language.native}</span>
                {language.native !== language.label && <span className="language-latin">{language.label}</span>}
              </label>
            ))}
          </div>
        </fieldset>

        {!speechSupported && (
          <p className="step-hint">
            This browser cannot transcribe speech, so typing is the reliable route here. Everything else works
            exactly the same.
          </p>
        )}

        {!liveReady && (
          <div className="intake-actions">
            <button type="button" className="secondary-button" onClick={onManual}>
              Manual entry
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  requestEmailCode,
  signOutEmail,
  verifiedEmail,
  verifyEmailCode,
} from "@/lib/application-records";

/* ============================================================
   Email verification. Mirrors the official portal's first step:
   the citizen proves the address before the application is
   stored against it.
   ============================================================ */

type Phase = "collect" | "code" | "verified";

interface EmailVerificationProps {
  email: string;
  onEmailChange: (email: string) => void;
  onVerified: (email: string) => void;
  /** Reset upstream state when the citizen signs out. */
  onSignOut?: () => void;
}

export default function EmailVerification({
  email,
  onEmailChange,
  onVerified,
  onSignOut,
}: EmailVerificationProps) {
  const [phase, setPhase] = useState<Phase>("collect");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // A verified cookie may already exist from an earlier visit.
  useEffect(() => {
    let active = true;
    void verifiedEmail().then((found) => {
      if (!active || !found) return;
      onEmailChange(found);
      setPhase("verified");
      onVerified(found);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((n) => n - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function sendCode() {
    setBusy(true);
    setError(null);
    setNotice(null);
    setDevCode(null);
    try {
      const outcome = await requestEmailCode(email);
      setNotice(outcome.notice);
      setDevCode(outcome.devCode ?? null);
      setPhase("code");
      setCooldown(60);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The code could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCode() {
    setBusy(true);
    setError(null);
    try {
      await verifyEmailCode(email, code);
      setPhase("verified");
      setCode("");
      setNotice(null);
      setDevCode(null);
      onVerified(email.trim().toLowerCase());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That code could not be verified.");
    } finally {
      setBusy(false);
    }
  }

  async function changeAddress() {
    await signOutEmail();
    setPhase("collect");
    setCode("");
    setError(null);
    setNotice(null);
    onSignOut?.();
  }

  if (phase === "verified") {
    return (
      <div className="verify-panel is-verified">
        <div>
          <span className="verify-badge">Email verified</span>
          <strong>{email}</strong>
          <p>Your application will be saved against this address so you can reopen it later.</p>
        </div>
        <button type="button" className="verify-secondary" onClick={() => void changeAddress()}>
          Use a different address
        </button>
      </div>
    );
  }

  return (
    <div className="verify-panel">
      {phase === "collect" ? (
        <>
          <label htmlFor="verify-email">Email address</label>
          <p className="verify-hint">
            The official portal sends a one time code to your email before it accepts an application. This step
            does the same, so your saved copy is protected.
          </p>
          <div className="verify-row">
            <input
              id="verify-email"
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && email.includes("@")) void sendCode();
              }}
              autoComplete="email"
              placeholder="you@example.com"
            />
            <button type="button" onClick={() => void sendCode()} disabled={busy || !email.includes("@")}>
              {busy ? "Sending…" : "Send code"}
            </button>
          </div>
        </>
      ) : (
        <>
          <label htmlFor="verify-code">Six digit code</label>
          <p className="verify-hint">
            Sent to <strong>{email}</strong>. It expires in ten minutes and can be used once.
          </p>
          <div className="verify-row">
            <input
              id="verify-code"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(event) => {
                if (event.key === "Enter" && code.length === 6) void submitCode();
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              className="verify-code-input"
            />
            <button type="button" onClick={() => void submitCode()} disabled={busy || code.length !== 6}>
              {busy ? "Checking…" : "Verify"}
            </button>
          </div>
          <div className="verify-actions">
            <button type="button" className="verify-secondary" onClick={() => setPhase("collect")}>
              Change address
            </button>
            <button
              type="button"
              className="verify-secondary"
              onClick={() => void sendCode()}
              disabled={busy || cooldown > 0}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </div>
        </>
      )}

      {notice && <p className="verify-notice">{notice}</p>}
      {devCode && (
        <p className="verify-devcode">
          Demo mode: default verification code is <strong>{devCode}</strong>.
        </p>
      )}
      {error && <p className="verify-error" role="alert">{error}</p>}
    </div>
  );
}

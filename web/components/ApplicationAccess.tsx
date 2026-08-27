"use client";

import { useEffect, useMemo, useState } from "react";
import {
  base64ToBlob,
  downloadPdfBase64,
  findApplication,
  listApplications,
  type ApplicationSummary,
  type StoredApplication,
} from "@/lib/application-records";

type AccessMode = "acknowledgement" | "login";

export default function ApplicationAccess() {
  const [mode, setMode] = useState<AccessMode>("acknowledgement");
  const [ack, setAck] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [application, setApplication] = useState<StoredApplication | null>(null);
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [previewKind, setPreviewKind] = useState<"application" | "receipt">("application");

  const previewUrl = useMemo(() => {
    if (!application) return null;
    const base64 = previewKind === "application" ? application.applicationPdfBase64 : application.receiptPdfBase64;
    return URL.createObjectURL(base64ToBlob(base64));
  }, [application, previewKind]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function retrieve(nextAck = ack) {
    const normalized = nextAck.trim().toUpperCase();
    if (!normalized) {
      setError("Enter the Praja acknowledgement number printed on the receipt.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const record = await findApplication(normalized);
      if (!record) {
        setApplication(null);
        setError("No saved application matched that number. Check every letter and number, then try again.");
        return;
      }
      setAck(record.acknowledgementNumber);
      setApplication(record);
      setPreviewKind("application");
    } catch {
      setError("The application store could not be reached. Try again when you are online or on the device used to prepare it.");
    } finally {
      setBusy(false);
    }
  }

  async function signIn() {
    if (!email.trim() || !email.includes("@")) {
      setError("Enter the email address used at the verification step.");
      return;
    }
    setBusy(true);
    setError(null);
    setApplication(null);
    try {
      const rows = await listApplications(email, otp);
      setApplications(rows);
      if (!rows.length) setError("No applications are stored for that email address yet.");
    } catch (cause) {
      setApplications([]);
      setError(cause instanceof Error ? cause.message : "Could not open the application history.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="application-access" id="application-access" aria-labelledby="application-access-title">
      <div className="application-access-copy">
        <h2 id="application-access-title">Open a saved application.</h2>
        <p>
          Use the Praja acknowledgement number from step 9, or sign in locally with the email used during verification.
        </p>
        <p className="application-access-boundary">
          These are local Praja RTI records. Government RTI status is available only on the official portal with its own registration number.
        </p>
      </div>

      <div className="application-access-workspace">
        <div className="application-access-tabs" role="tablist" aria-label="Saved application access method">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "acknowledgement"}
            className={mode === "acknowledgement" ? "is-active" : ""}
            onClick={() => { setMode("acknowledgement"); setError(null); }}
          >
            Acknowledgement number
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            className={mode === "login" ? "is-active" : ""}
            onClick={() => { setMode("login"); setError(null); }}
          >
            Citizen sign-in
          </button>
        </div>

        {mode === "acknowledgement" ? (
          <div className="application-access-form" role="tabpanel">
            <label htmlFor="acknowledgement-number">Praja acknowledgement number</label>
            <div className="application-access-row">
              <input
                id="acknowledgement-number"
                value={ack}
                onChange={(event) => setAck(event.target.value.toUpperCase())}
                onKeyDown={(event) => { if (event.key === "Enter") void retrieve(); }}
                placeholder="PRTI/ACK/26/XXXXXXXXX"
                autoComplete="off"
              />
              <button type="button" onClick={() => void retrieve()} disabled={busy}>
                {busy ? "Looking up..." : "Open copy"}
              </button>
            </div>
          </div>
        ) : (
          <div className="application-access-form" role="tabpanel">
            <div className="application-login-grid">
              <label>
                Email used during verification
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
              </label>
              <label>
                Local verification code
                <input
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  placeholder="123456"
                  autoComplete="one-time-code"
                />
              </label>
            </div>
            <button type="button" className="application-login-button" onClick={() => void signIn()} disabled={busy || otp.length !== 6}>
              {busy ? "Opening..." : "Open my applications"}
            </button>
            {applications.length > 0 && (
              <ul className="application-history-list">
                {applications.map((item) => (
                  <li key={item.acknowledgementNumber}>
                    <button type="button" onClick={() => void retrieve(item.acknowledgementNumber)}>
                      <span>{item.title}</span>
                      <small>{item.acknowledgementNumber} · {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(item.createdAt))}</small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {error && <p className="application-access-error" role="alert">{error}</p>}

        {application && (
          <div className="application-result">
            <div className="application-result-heading">
              <div>
                <strong>{application.report.title}</strong>
                <span>{application.acknowledgementNumber}</span>
              </div>
              <span className="application-result-status">Praja copy stored</span>
            </div>
            <dl>
              <div><dt>Authority</dt><dd>{application.report.authority.name}</dd></div>
              <div><dt>Prepared</dt><dd>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(application.createdAt))}</dd></div>
              <div><dt>Government status</dt><dd>Not submitted</dd></div>
            </dl>
            <div className="application-preview-tabs" role="tablist" aria-label="Saved PDF preview">
              <button type="button" className={previewKind === "application" ? "is-active" : ""} onClick={() => setPreviewKind("application")}>Application PDF</button>
              <button type="button" className={previewKind === "receipt" ? "is-active" : ""} onClick={() => setPreviewKind("receipt")}>Receipt PDF</button>
            </div>
            {previewUrl && (
              <object className="application-pdf-object" data={previewUrl} type="application/pdf" aria-label={`${previewKind} PDF preview`}>
                <p>Your browser cannot show the PDF preview. Use the download buttons below.</p>
              </object>
            )}
            <div className="application-result-actions">
              <button type="button" onClick={() => downloadPdfBase64("praja-rti-application.pdf", application.applicationPdfBase64)}>Download application PDF</button>
              <button type="button" onClick={() => downloadPdfBase64("praja-rti-receipt.pdf", application.receiptPdfBase64)}>Download receipt PDF</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

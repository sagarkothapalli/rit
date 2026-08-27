"use client";

import { useEffect, useMemo, useState } from "react";
import {
  base64ToBlob,
  downloadPdfBase64,
  findApplication,
  listApplications,
  signOutEmail,
  verifiedEmail,
  type ApplicationSummary,
  type StoredApplication,
} from "@/lib/application-records";
import EmailVerification from "@/components/EmailVerification";

/* ============================================================
   Reopening a saved application. Two routes, because the two
   situations are genuinely different:

     - You have the reference number from the receipt. That
       number is the secret, so it needs nothing else.
     - You lost the number. Then you prove the email address and
       we list everything saved against it.
   ============================================================ */

type AccessMode = "reference" | "email";

export default function ApplicationAccess() {
  const [mode, setMode] = useState<AccessMode>("reference");
  const [ack, setAck] = useState("");
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState<string | null>(null);
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

  // A browser that verified earlier can go straight to its history.
  useEffect(() => {
    let active = true;
    void verifiedEmail().then((found) => {
      if (!active || !found) return;
      setEmail(found);
      setVerified(found);
    });
    return () => {
      active = false;
    };
  }, []);

  async function openByReference(next = ack) {
    const normalized = next.trim().toUpperCase();
    if (!normalized) {
      setError("Enter the reference number printed on your receipt.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const record = await findApplication(normalized);
      if (!record) {
        setApplication(null);
        setError("No saved application matched that number. Check every character and try again.");
        return;
      }
      setAck(record.acknowledgementNumber);
      setApplication(record);
      setPreviewKind("application");
    } catch {
      setError("The application store could not be reached. Try again when you are online.");
    } finally {
      setBusy(false);
    }
  }

  async function loadHistory(address: string) {
    setBusy(true);
    setError(null);
    setApplication(null);
    try {
      const rows = await listApplications(address);
      setApplications(rows);
      if (rows.length === 0) setError("Nothing is saved against that address yet.");
    } catch (cause) {
      setApplications([]);
      setError(cause instanceof Error ? cause.message : "Could not open your history.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="application-access" id="saved-applications" aria-labelledby="saved-applications-title">
      <div className="application-access-copy">
        <h2 id="saved-applications-title">Reopen a saved application</h2>
        <p>
          Every application you prepare here is saved with a reference number. Use that number, or verify your email
          address to see everything saved against it.
        </p>
        <p className="application-access-boundary">
          These are Praja records. The status of an application you filed with the government is available only on
          the official portal, using the registration number it issued.
        </p>
      </div>

      <div className="application-access-workspace">
        <div className="application-access-tabs" role="tablist" aria-label="How to reopen an application">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "reference"}
            className={mode === "reference" ? "is-active" : ""}
            onClick={() => { setMode("reference"); setError(null); }}
          >
            I have my reference number
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "email"}
            className={mode === "email" ? "is-active" : ""}
            onClick={() => { setMode("email"); setError(null); }}
          >
            I lost it
          </button>
        </div>

        {mode === "reference" ? (
          <div className="application-access-form" role="tabpanel">
            <label htmlFor="reference-number">Praja reference number</label>
            <div className="application-access-row">
              <input
                id="reference-number"
                value={ack}
                onChange={(event) => setAck(event.target.value.toUpperCase())}
                onKeyDown={(event) => { if (event.key === "Enter") void openByReference(); }}
                placeholder="PRTI/ACK/26/XXXXXXXXX"
                autoComplete="off"
              />
              <button type="button" onClick={() => void openByReference()} disabled={busy}>
                {busy ? "Looking up…" : "Open"}
              </button>
            </div>
          </div>
        ) : (
          <div className="application-access-form" role="tabpanel">
            {verified ? (
              <div className="access-verified">
                <p>
                  Verified as <strong>{verified}</strong>.
                </p>
                <div className="access-verified-actions">
                  <button type="button" onClick={() => void loadHistory(verified)} disabled={busy}>
                    {busy ? "Opening…" : "Show my applications"}
                  </button>
                  <button
                    type="button"
                    className="link-button"
                    onClick={async () => {
                      await signOutEmail();
                      setVerified(null);
                      setApplications([]);
                      setApplication(null);
                    }}
                  >
                    Sign out
                  </button>
                </div>
              </div>
            ) : (
              <EmailVerification
                email={email}
                onEmailChange={setEmail}
                onVerified={(address) => {
                  setVerified(address);
                  void loadHistory(address);
                }}
                onSignOut={() => {
                  setVerified(null);
                  setApplications([]);
                }}
              />
            )}

            {applications.length > 0 && (
              <ul className="application-history-list">
                {applications.map((item) => (
                  <li key={item.acknowledgementNumber}>
                    <button type="button" onClick={() => void openByReference(item.acknowledgementNumber)}>
                      <span>{item.title}</span>
                      <small>
                        {item.acknowledgementNumber} ·{" "}
                        {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(item.createdAt))}
                      </small>
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
              <span className="application-result-status">Copy saved</span>
            </div>
            <dl>
              <div><dt>Authority</dt><dd>{application.report.authority.name}</dd></div>
              <div>
                <dt>Prepared</dt>
                <dd>
                  {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(
                    new Date(application.createdAt),
                  )}
                </dd>
              </div>
              <div><dt>Government status</dt><dd>Not submitted</dd></div>
            </dl>
            <div className="application-preview-tabs" role="tablist" aria-label="Which PDF to preview">
              <button
                type="button"
                className={previewKind === "application" ? "is-active" : ""}
                onClick={() => setPreviewKind("application")}
              >
                Application
              </button>
              <button
                type="button"
                className={previewKind === "receipt" ? "is-active" : ""}
                onClick={() => setPreviewKind("receipt")}
              >
                Receipt
              </button>
            </div>
            {previewUrl && (
              <object
                className="application-pdf-object"
                data={previewUrl}
                type="application/pdf"
                aria-label={`${previewKind} PDF preview`}
              >
                <p>This browser cannot display the PDF. Use the download buttons below.</p>
              </object>
            )}
            <div className="application-result-actions">
              <button
                type="button"
                onClick={() => downloadPdfBase64("praja-rti-application.pdf", application.applicationPdfBase64)}
              >
                Download application
              </button>
              <button
                type="button"
                onClick={() => downloadPdfBase64("praja-rti-receipt.pdf", application.receiptPdfBase64)}
              >
                Download receipt
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

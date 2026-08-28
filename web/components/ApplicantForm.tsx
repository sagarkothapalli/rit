"use client";

import { useCallback, useRef, useState } from "react";
import {
  AREA_STATUSES,
  COUNTRIES,
  EDUCATIONAL_STATUSES,
  GENDERS,
  lookupPincode,
  problemFor,
  STATES,
  type ApplicantDetails,
  type BplDocumentAttachment,
  type FieldProblem,
} from "@/lib/applicant";
import { bplVerificationFallback, type BplVerification } from "@/lib/cage/schemas";

/* ============================================================
   Applicant particulars. Field set, order, and mandatory marks
   mirror the official RTI Online request form so nothing is a
   surprise when the citizen transcribes it.
   ============================================================ */

interface ApplicantFormProps {
  value: ApplicantDetails;
  onChange: (next: ApplicantDetails) => void;
  problems: FieldProblem[];
  /** Fields the voice agent filled, shown as confirm-me rather than blank. */
  prefilled?: ReadonlySet<keyof ApplicantDetails>;
  /** Email is locked once verified, so the record matches the verified address. */
  emailLocked?: boolean;
  mobileRequired?: boolean;
  maxAttachmentBytes?: number;
}

export default function ApplicantForm({
  value,
  onChange,
  problems,
  prefilled,
  emailLocked = false,
  mobileRequired = true,
  maxAttachmentBytes = 1_000_000,
}: ApplicantFormProps) {
  function set<K extends keyof ApplicantDetails>(key: K, next: ApplicantDetails[K]) {
    onChange({ ...value, [key]: next });
  }

  function handlePincodeChange(raw: string) {
    const pincode = raw.replace(/\D/g, "").slice(0, 6);
    if (pincode.length === 6) {
      const match = lookupPincode(pincode);
      if (match) {
        onChange({
          ...value,
          pincode,
          state: match.state,
          areaStatus: match.areaStatus,
        });
        return;
      }
    }
    set("pincode", pincode);
  }

  function handleBplToggle(checked: boolean) {
    if (!checked) {
      onChange({ ...value, isBpl: false, bplDocument: null });
    } else {
      onChange({ ...value, isBpl: true });
    }
  }

  const err = (field: keyof ApplicantDetails) => problemFor(problems, field);
  const wasPrefilled = (field: keyof ApplicantDetails) => Boolean(prefilled?.has(field));

  return (
    <div className="applicant-form">
      {prefilled && prefilled.size > 0 && (
        <p className="applicant-prefill-note">
          The marked fields were taken from your conversation with the RTI agent. Check each one before continuing.
        </p>
      )}

      <fieldset>
        <legend>Applicant</legend>

        <Field label="Full name" required error={err("name")} hint={wasPrefilled("name") ? "From your conversation" : undefined}>
          <input
            value={value.name}
            onChange={(event) => set("name", event.target.value)}
            autoComplete="name"
            maxLength={160}
          />
        </Field>

        <Choice
          label="Gender"
          required
          error={err("gender")}
          name="applicant-gender"
          options={GENDERS}
          value={value.gender}
          onChange={(next) => set("gender", next)}
        />
      </fieldset>

      <fieldset>
        <legend>Address for the reply</legend>

        <Field label="Postal address" required error={err("address")} hint={wasPrefilled("address") ? "From your conversation" : undefined}>
          <textarea
            value={value.address}
            onChange={(event) => set("address", event.target.value)}
            autoComplete="street-address"
            rows={3}
            maxLength={800}
          />
        </Field>

        <div className="applicant-row">
          <Field label="PIN code" error={err("pincode")}>
            <input
              value={value.pincode}
              onChange={(event) => handlePincodeChange(event.target.value)}
              inputMode="numeric"
              autoComplete="postal-code"
            />
          </Field>

          <Field label="State or Union Territory" required error={err("state")}>
            <select value={value.state} onChange={(event) => set("state", event.target.value)}>
              <option value="">Select</option>
              {STATES.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </Field>

          <Field
            label="Country"
            required
            note="(Change if you are not from India)"
            error={err("country")}
          >
            <select
              value={value.country}
              onChange={(event) => set("country", event.target.value as ApplicantDetails["country"])}
            >
              {COUNTRIES.map((country) => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="applicant-row">
          <Choice
            label="Status"
            required
            name="applicant-area"
            options={AREA_STATUSES}
            value={value.areaStatus}
            onChange={(next) => set("areaStatus", next)}
          />
          <Choice
            label="Educational status"
            required
            name="applicant-education"
            options={EDUCATIONAL_STATUSES}
            value={value.educationalStatus}
            onChange={(next) => set("educationalStatus", next)}
          />
        </div>
      </fieldset>

      <fieldset>
        <legend>Contact</legend>

        <Field
          label="Mobile number"
          required={mobileRequired}
          error={err("mobile")}
          hint="Used for SMS alerts on the official portal."
        >
          <input
            value={value.mobile}
            onChange={(event) => set("mobile", event.target.value.replace(/\D/g, "").slice(0, 10))}
            inputMode="tel"
            autoComplete="tel"
          />
        </Field>

        <Field label="Landline" error={err("phone")} hint="Optional.">
          <input
            value={value.phone}
            onChange={(event) => set("phone", event.target.value.replace(/[^\d+\-\s]/g, "").slice(0, 20))}
            inputMode="tel"
            autoComplete="tel-national"
          />
        </Field>

        <Field
          label="Email address"
          required
          error={err("email")}
          hint={emailLocked ? "Verified. Sign out to change it." : undefined}
        >
          <input
            type="email"
            value={value.email}
            onChange={(event) => set("email", event.target.value)}
            autoComplete="email"
            readOnly={emailLocked}
            maxLength={254}
          />
        </Field>
      </fieldset>

      <fieldset>
        <legend>Fee and citizenship</legend>

        <Field label="Citizenship" required>
          <input value={value.citizenship} readOnly aria-describedby="citizenship-hint" />
        </Field>
        <p className="applicant-hint" id="citizenship-hint">
          Only Indian citizens can file under the RTI Act, 2005.
        </p>

        <label className="applicant-check">
          <input
            type="checkbox"
            checked={value.isBpl}
            onChange={(event) => handleBplToggle(event.target.checked)}
          />
          <span>
            I am below the poverty line. No application fee is payable, and a copy of the BPL certificate issued
            by the appropriate government must be attached.
          </span>
        </label>

        {value.isBpl && (
          <>
            <BplDocumentUpload
              document={value.bplDocument}
              onChange={(nextDoc) => set("bplDocument", nextDoc)}
              error={err("bplDocument")}
              maxBytes={maxAttachmentBytes}
            />
            <div className="applicant-row">
            <Field label="BPL card / certificate number">
              <input
                value={value.bplCardNumber ?? ""}
                onChange={(event) => set("bplCardNumber", event.target.value)}
                maxLength={40}
              />
            </Field>
            <Field label="Year of issue">
              <input
                value={value.bplYearOfIssue ?? ""}
                onChange={(event) => set("bplYearOfIssue", event.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
              />
            </Field>
          </div>
          <Field label="Issuing authority">
            <input
              value={value.bplIssuingAuthority ?? ""}
              onChange={(event) => set("bplIssuingAuthority", event.target.value)}
              maxLength={160}
            />
          </Field>
          </>
        )}
      </fieldset>

      <p className="applicant-boundary">
        Never attach an Aadhaar card, PAN card, or any other identity document. The official portal forbids it —
        only a BPL certificate may be uploaded.
      </p>
    </div>
  );
}

function Field({
  label,
  required = false,
  note,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  note?: string;
  error?: string | null;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`applicant-field${error ? " has-error" : ""}`}>
      <span className="applicant-label">
        {label}
        {required && <em aria-hidden="true"> *</em>}
        {required && <span className="sr-only"> (required)</span>}
        {note && <span className="applicant-label-note"> {note}</span>}
      </span>
      {children}
      {hint && !error && <small className="applicant-hint">{hint}</small>}
      {error && <small className="applicant-error" role="alert">{error}</small>}
    </label>
  );
}

function Choice<T extends string>({
  label,
  required = false,
  error,
  name,
  options,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  error?: string | null;
  name: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <fieldset className={`applicant-choice${error ? " has-error" : ""}`}>
      <legend className="applicant-label">
        {label}
        {required && <em aria-hidden="true"> *</em>}
      </legend>
      <div className="applicant-choice-options">
        {options.map((option) => (
          <label key={option} className={value === option ? "is-selected" : ""}>
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
      {error && <small className="applicant-error" role="alert">{error}</small>}
    </fieldset>
  );
}

function statusFromVerdict(verdict: BplVerification["verdict"]): BplDocumentAttachment["status"] {
  if (verdict === "VALID_BPL") return "valid";
  if (verdict === "FLAGGED_WRONG_DOCUMENT") return "flagged";
  return "unverified";
}

function BplDocumentUpload({
  document,
  onChange,
  error,
  maxBytes,
}: {
  document?: BplDocumentAttachment | null;
  onChange: (next: BplDocumentAttachment | null) => void;
  error?: string | null;
  maxBytes: number;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const verifyFile = useCallback(
    async (file: { name: string; size: number; type: string }, dataUrl: string) => {
      onChange({
        name: file.name,
        size: file.size,
        type: file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
        dataUrl,
        status: "verifying",
        documentType: "Document",
      });

      try {
        const res = await fetch("/api/agent/verify-bpl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type || "application/octet-stream",
            fileSize: file.size,
            fileBase64: dataUrl,
          }),
        });

        if (!res.ok) {
          throw new Error("Verification service unavailable");
        }

        const json = (await res.json()) as { data?: BplVerification; mode?: string };
        const data = json.data;
        if (!data) throw new Error("Invalid response");

        onChange({
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl,
          status: statusFromVerdict(data.verdict),
          documentType: data.document_type,
          isForbiddenId: data.is_forbidden_id,
          flagReason: data.reason_summary,
          confidence: data.confidence,
          extractedDetails: data.extracted_details
            ? {
                cardNumber: data.extracted_details.card_number ?? undefined,
                holderName: data.extracted_details.holder_name ?? undefined,
                category: data.extracted_details.category ?? undefined,
                state: data.extracted_details.state ?? undefined,
              }
            : undefined,
        });
      } catch {
        // Deterministic fallback screening
        const fallback = bplVerificationFallback(file.name);
        onChange({
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl,
          status: statusFromVerdict(fallback.verdict),
          documentType: fallback.document_type,
          isForbiddenId: fallback.is_forbidden_id,
          flagReason: fallback.reason_summary,
          confidence: fallback.confidence,
        });
      }
    },
    [onChange]
  );

  const processFile = useCallback(
    (file: File) => {
      setLocalError(null);
      const validTypes = [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ];
      const isPdfOrImage =
        validTypes.includes(file.type) || /\.(pdf|jpe?g|png|webp)$/i.test(file.name);

      if (!isPdfOrImage) {
        setLocalError("Invalid file format. Please upload a PDF, JPG, PNG, or WebP document.");
        return;
      }

      if (file.size > maxBytes) {
        const mb = maxBytes / 1_000_000;
        setLocalError(`This destination accepts files up to ${mb % 1 === 0 ? mb.toFixed(0) : mb.toFixed(1)} MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        void verifyFile({ name: file.name, size: file.size, type: file.type }, dataUrl);
      };
      reader.onerror = () => {
        setLocalError("Could not read file from your device. Please try again.");
      };
      reader.readAsDataURL(file);
    },
    [verifyFile, maxBytes]
  );

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setLocalError(null);
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerPicker = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={`bpl-upload-card${error || localError ? " has-error" : ""}`}>
      <div className="bpl-upload-header">
        <div className="bpl-upload-header-left">
          <span className="bpl-upload-title">
            BPL Certificate or Ration Card
            <em aria-hidden="true"> *</em>
            <span className="sr-only"> (required for fee exemption)</span>
          </span>
          <span className="bpl-upload-subtitle">
            Upload your government-issued BPL certificate, Antyodaya / BPL ration card, or NFSA card.
          </span>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        id="bpl-file-input"
        accept=".pdf,image/jpeg,image/png,image/webp,image/jpg"
        className="sr-only"
        onChange={handleFileSelect}
      />

      {!document ? (
        <div
          className={`bpl-dropzone${isDragging ? " is-dragover" : ""}`}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerPicker}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              triggerPicker();
            }
          }}
          aria-label="Drag and drop BPL document or browse file"
        >
          <div className="bpl-dropzone-icon" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className="bpl-dropzone-prompt">
            <strong>Drag and drop</strong> your BPL document here, or
          </p>
          <button
            type="button"
            className="bpl-choose-btn"
            onClick={(e) => {
              e.stopPropagation();
              triggerPicker();
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span>Choose file from device</span>
          </button>
          <span className="bpl-dropzone-hint">
            PDF, JPG, PNG, or WebP • Max 5 MB
          </span>
        </div>
      ) : (
        <div className={`bpl-file-card bpl-file-${document.status}`}>
          <div className="bpl-file-info">
            <div className="bpl-file-icon" aria-hidden="true">
              {document.type?.startsWith("image/") && document.dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={document.dataUrl} alt="Thumbnail" className="bpl-thumb" />
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              )}
            </div>
            <div className="bpl-file-meta">
              <span className="bpl-file-name" title={document.name}>{document.name}</span>
              <span className="bpl-file-size">
                {formatFileSize(document.size)} • {document.documentType || "BPL Document"}
              </span>
            </div>
            <div className="bpl-file-actions">
              <button
                type="button"
                className="bpl-action-btn"
                onClick={triggerPicker}
                title="Change file"
              >
                Change
              </button>
              <button
                type="button"
                className="bpl-action-btn is-remove"
                onClick={removeFile}
                title="Remove file"
              >
                Remove
              </button>
            </div>
          </div>

          {/* AI Verification Status Card */}
          {document.status === "verifying" && (
            <div className="bpl-status-banner is-verifying" role="status">
              <div className="bpl-spinner" aria-hidden="true" />
              <div className="bpl-status-text">
                <strong>AI Document Check in progress…</strong>
                <span>Verifying BPL validity and screening against forbidden ID rules.</span>
              </div>
            </div>
          )}

          {document.status === "valid" && (
            <div className="bpl-status-banner is-valid" role="status">
              <div className="bpl-status-badge-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
              </div>
              <div className="bpl-status-text">
                <div className="bpl-status-heading">
                  <strong>Verified BPL Document:</strong> {document.documentType}
                </div>
                <p className="bpl-status-desc">
                  {document.flagReason || "Valid proof of Below Poverty Line status. Application fee is Nil (exempted)."}
                </p>
                {document.extractedDetails?.cardNumber && (
                  <span className="bpl-tag">Card No: {document.extractedDetails.cardNumber}</span>
                )}
              </div>
            </div>
          )}

          {document.status === "unverified" && (
            <div className="bpl-status-banner is-unverified" role="status">
              <div className="bpl-status-text">
                <div className="bpl-status-heading">
                  <strong>Unverified — review required:</strong> {document.documentType || "Document"}
                </div>
                <p className="bpl-status-desc">
                  {document.flagReason
                    || "Automatic verification is unavailable. The file is stored with the packet and is not treated as proven BPL eligibility."}
                </p>
              </div>
            </div>
          )}

          {document.status === "flagged" && (
            <div className="bpl-status-banner is-flagged" role="alert">
              <div className="bpl-status-badge-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div className="bpl-status-text">
                <div className="bpl-status-heading">
                  <strong>Document Flagged:</strong> {document.documentType || "Invalid Document"}
                </div>
                <p className="bpl-status-desc">
                  {document.flagReason ||
                    "This document cannot be accepted. The official RTI portal forbids personal identity cards like Aadhaar or PAN. You must upload a government-issued BPL certificate or BPL ration card."}
                </p>
                <button type="button" className="bpl-replace-link" onClick={triggerPicker}>
                  Upload a valid BPL certificate →
                </button>
              </div>
            </div>
          )}

          {document.status === "error" && (
            <div className="bpl-status-banner is-error" role="alert">
              <div className="bpl-status-badge-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div className="bpl-status-text">
                <strong>Verification check failed</strong>
                <span>Could not reach the verification service. You may retry or select another file.</span>
                <button type="button" className="bpl-replace-link" onClick={triggerPicker}>
                  Choose another file
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {localError && (
        <small className="applicant-error" role="alert">
          {localError}
        </small>
      )}
      {error && !localError && (
        <small className="applicant-error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}

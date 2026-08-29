import type { ApplicantDetails } from "@/lib/applicant";
import type { ApplicationReport } from "@/lib/report";
import { openDb } from "@/lib/storage/cases.client";

export type { ApplicantDetails };

export interface StoredApplication {
  acknowledgementNumber: string;
  reference: string;
  createdAt: string;
  status: "PRAJA_ACKNOWLEDGED";
  governmentSubmissionStatus: "NOT_SUBMITTED";
  applicant: ApplicantDetails;
  report: ApplicationReport;
  applicationPdfBase64: string;
  receiptPdfBase64: string;
}

export interface ApplicationSummary {
  acknowledgementNumber: string;
  reference: string;
  createdAt: string;
  title: string;
  authority: string;
  status: StoredApplication["status"];
}

// This store lives in the case database, which cases.client.ts opens at a
// higher version. Opening the same name at version 1 here threw a VersionError
// the moment anything had upgraded it, so both use the one opener.
const STORE_NAME = "applications";

async function localPut(record: StoredApplication): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not save this application locally."));
  });
  db.close();
}

async function localGet(acknowledgementNumber: string): Promise<StoredApplication | null> {
  const db = await openDb();
  const record = await new Promise<StoredApplication | null>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(acknowledgementNumber);
    request.onsuccess = () => resolve((request.result as StoredApplication | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Could not read the local application database."));
  });
  db.close();
  return record;
}

async function localList(email: string): Promise<ApplicationSummary[]> {
  const db = await openDb();
  const rows = await new Promise<StoredApplication[]>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).index("email").getAll(email.toLowerCase());
    request.onsuccess = () => resolve((request.result as StoredApplication[]) ?? []);
    request.onerror = () => reject(request.error ?? new Error("Could not read the local application database."));
  });
  db.close();
  return rows
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(toSummary);
}

function toSummary(record: StoredApplication): ApplicationSummary {
  return {
    acknowledgementNumber: record.acknowledgementNumber,
    reference: record.reference,
    createdAt: record.createdAt,
    title: record.report.title,
    authority: record.report.authority.name,
    status: record.status,
  };
}

export function makeAcknowledgementNumber(date = new Date()): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let token = "";
  for (const byte of bytes) token += alphabet[byte % alphabet.length];
  return `PRTI/ACK/${String(date.getFullYear()).slice(-2)}/${token}`;
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBlob(value: string, type = "application/pdf"): Blob {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

export function downloadPdfBase64(filename: string, value: string): void {
  const url = URL.createObjectURL(base64ToBlob(value));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function saveApplication(record: StoredApplication): Promise<void> {
  await localPut({
    ...record,
    applicant: { ...record.applicant, email: record.applicant.email.trim().toLowerCase() },
  });
}

export async function findApplication(acknowledgementNumber: string): Promise<StoredApplication | null> {
  return localGet(acknowledgementNumber.trim().toUpperCase());
}

/* ---------- email verification ----------
   There is none, and none is intended. No mailer, no provider, no server, no
   session that outlives the page: the code is 0000, it is printed on screen,
   and reloading starts over.
   ponytail: a stand-in for the portal's first step, not auth. Nothing
   server-side trusts it — every owner-scoped route refuses regardless. */

export { DEMO_EMAIL } from "@/lib/applicant";

/** The only accepted code. Shown to the citizen, not a secret. */
export const DEMO_CODE = "0000";

/** Module state, so nothing survives a reload, a new tab, or a new visit. */
let verifiedAddress: string | null = null;

export async function requestEmailCode(email: string): Promise<void> {
  if (!email.trim().includes("@")) throw new Error("Enter a valid email address.");
}

export async function verifyEmailCode(email: string, code: string): Promise<void> {
  if (code.replace(/\D/g, "") !== DEMO_CODE) {
    throw new Error(`That code is not correct. Enter ${DEMO_CODE}.`);
  }
  verifiedAddress = email.trim().toLowerCase();
}

/** The address verified in this page view, or null. Never read from storage. */
export async function verifiedEmail(): Promise<string | null> {
  return verifiedAddress;
}

export async function signOutEmail(): Promise<void> {
  verifiedAddress = null;
}

/** Applications saved on this device against the given address. */
export async function listApplications(email: string): Promise<ApplicationSummary[]> {
  return localList(email.trim().toLowerCase());
}

import type { ApplicationReport } from "@/lib/report";

export interface ApplicantDetails {
  name: string;
  email: string;
  address: string;
  mobile: string;
  citizenship: "Indian";
  isBpl: boolean;
}

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

const DB_NAME = "praja-rti-applications";
const STORE_NAME = "applications";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.createObjectStore(STORE_NAME, { keyPath: "acknowledgementNumber" });
      store.createIndex("email", "applicant.email", { unique: false });
      store.createIndex("createdAt", "createdAt", { unique: false });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the local application database."));
  });
}

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

function jsonResponse(res: Response): boolean {
  return (res.headers.get("content-type") ?? "").includes("application/json");
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

export async function saveApplication(record: StoredApplication): Promise<"server-and-device" | "device-only"> {
  const normalized: StoredApplication = {
    ...record,
    applicant: { ...record.applicant, email: record.applicant.email.trim().toLowerCase() },
  };
  await localPut(normalized);
  try {
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalized),
    });
    if (res.ok && jsonResponse(res)) return "server-and-device";
  } catch {
    // Static builds and offline use retain the IndexedDB copy.
  }
  return "device-only";
}

export async function findApplication(acknowledgementNumber: string): Promise<StoredApplication | null> {
  const ack = acknowledgementNumber.trim().toUpperCase();
  try {
    const res = await fetch(`/api/applications?ack=${encodeURIComponent(ack)}`, { cache: "no-store" });
    if (res.ok && jsonResponse(res)) {
      const payload = (await res.json()) as { application?: StoredApplication };
      if (payload.application) {
        await localPut(payload.application);
        return payload.application;
      }
    }
  } catch {
    // Fall back to this browser's database.
  }
  return localGet(ack);
}

export async function listApplications(email: string, otp: string): Promise<ApplicationSummary[]> {
  const normalized = email.trim().toLowerCase();
  try {
    const params = new URLSearchParams({ email: normalized, otp });
    const res = await fetch(`/api/applications?${params}`, { cache: "no-store" });
    if (res.ok && jsonResponse(res)) {
      const payload = (await res.json()) as { applications?: ApplicationSummary[] };
      if (payload.applications) return payload.applications;
    }
  } catch {
    // Static builds and offline use search the current browser.
  }
  if (otp !== "123456") throw new Error("Use the local verification code 123456.");
  return localList(normalized);
}

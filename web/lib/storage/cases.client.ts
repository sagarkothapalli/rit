import type { StoredApplication } from "@/lib/application-records";
import type { AttachmentKind, AttachmentRecord } from "@/lib/domain/attachments";
import type { CaseEvent } from "@/lib/domain/events";
import {
  toSummary,
  type CaseRecord,
  type CaseSummary,
  type OfficialReference,
} from "@/lib/domain/case";
import { hashAccessToken, newId } from "./id";
import { hydrateCase } from "./factory";
import { emptyMockPayment } from "@/lib/payment/mock";

const DB_NAME = "praja-rti-applications";
const DB_VERSION = 3;
const CASE_STORE = "cases";
const BLOB_STORE = "attachmentBlobs";
const TOKEN_STORE = "accessTokens";
const META_STORE = "meta";
const OLD_STORE = "applications";
const MIGRATION_KEY = "cases-v2-imported";

export interface StoredAccessToken {
  caseId: string;
  token: string;
  prajaReference: string;
}

export interface AttachmentBlob {
  id: string;
  caseId: string;
  mimeType: string;
  bytes: ArrayBuffer;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OLD_STORE)) {
        const applications = db.createObjectStore(OLD_STORE, { keyPath: "acknowledgementNumber" });
        applications.createIndex("email", "applicant.email", { unique: false });
        applications.createIndex("createdAt", "createdAt", { unique: false });
      }
      if (!db.objectStoreNames.contains(CASE_STORE)) {
        const cases = db.createObjectStore(CASE_STORE, { keyPath: "id" });
        cases.createIndex("prajaReference", "prajaReference", { unique: true });
        cases.createIndex("ownerEmail", "ownerEmail", { unique: false });
        cases.createIndex("updatedAt", "updatedAt", { unique: false });
        cases.createIndex("legacyAcknowledgementNumber", "legacyAcknowledgementNumber", { unique: false });
      }
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(TOKEN_STORE)) {
        const tokens = db.createObjectStore(TOKEN_STORE, { keyPath: "caseId" });
        tokens.createIndex("prajaReference", "prajaReference", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the case database."));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("The case database could not complete a write."));
    tx.onabort = () => reject(tx.error ?? new Error("The case database write was aborted."));
  });
}

export async function saveCaseLocal(record: CaseRecord): Promise<void> {
  const hydrated = hydrateCase(record);
  const db = await openDb();
  const stores = hydrated.accessToken ? [CASE_STORE, TOKEN_STORE] : [CASE_STORE];
  const tx = db.transaction(stores, "readwrite");
  const persistable = { ...hydrated };
  delete persistable.accessToken;
  tx.objectStore(CASE_STORE).put(persistable);
  if (hydrated.accessToken && tx.objectStoreNames.contains(TOKEN_STORE)) {
    tx.objectStore(TOKEN_STORE).put({
      caseId: hydrated.id,
      token: hydrated.accessToken,
      prajaReference: hydrated.prajaReference,
    } satisfies StoredAccessToken);
  }
  await txDone(tx);
  db.close();
}

export async function getCaseLocal(id: string): Promise<CaseRecord | null> {
  await migrateLegacyApplications();
  const db = await openDb();
  const record = await new Promise<CaseRecord | null>((resolve, reject) => {
    const request = db.transaction(CASE_STORE, "readonly").objectStore(CASE_STORE).get(id);
    request.onsuccess = () => resolve((request.result as CaseRecord | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Could not read the case."));
  });
  db.close();
  return record ? hydrateCase(record) : null;
}

async function getCaseByReferenceRaw(reference: string): Promise<CaseRecord | null> {
  const needle = reference.trim().toUpperCase();
  const db = await openDb();
  const record = await new Promise<CaseRecord | null>((resolve, reject) => {
    if (!db.objectStoreNames.contains(CASE_STORE)) {
      resolve(null);
      return;
    }
    const store = db.transaction(CASE_STORE, "readonly").objectStore(CASE_STORE);
    const index = store.index("prajaReference");
    const request = index.get(needle);
    request.onsuccess = () => {
      const found = (request.result as CaseRecord | undefined) ?? null;
      if (found) {
        resolve(found);
        return;
      }
      const legacy = store.index("legacyAcknowledgementNumber").get(needle);
      legacy.onsuccess = () => resolve((legacy.result as CaseRecord | undefined) ?? null);
      legacy.onerror = () => reject(legacy.error ?? new Error("Could not look up the reference."));
    };
    request.onerror = () => reject(request.error ?? new Error("Could not look up the reference."));
  });
  db.close();
  return record ? hydrateCase(record) : null;
}

export async function rememberAccessToken(caseId: string, token: string, prajaReference: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(TOKEN_STORE, "readwrite");
  tx.objectStore(TOKEN_STORE).put({ caseId, token, prajaReference });
  await txDone(tx);
  db.close();
}

export async function getAccessToken(caseId: string): Promise<string | null> {
  const db = await openDb();
  const row = await new Promise<StoredAccessToken | null>((resolve, reject) => {
    if (!db.objectStoreNames.contains(TOKEN_STORE)) {
      resolve(null);
      return;
    }
    const request = db.transaction(TOKEN_STORE, "readonly").objectStore(TOKEN_STORE).get(caseId);
    request.onsuccess = () => resolve((request.result as StoredAccessToken | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Could not read the recovery token."));
  });
  db.close();
  return row?.token ?? null;
}

export async function getAccessTokenByReference(reference: string): Promise<string | null> {
  const needle = reference.trim().toUpperCase();
  const db = await openDb();
  const row = await new Promise<StoredAccessToken | null>((resolve, reject) => {
    if (!db.objectStoreNames.contains(TOKEN_STORE)) {
      resolve(null);
      return;
    }
    const request = db.transaction(TOKEN_STORE, "readonly").objectStore(TOKEN_STORE).index("prajaReference").get(needle);
    request.onsuccess = () => resolve((request.result as StoredAccessToken | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Could not read the recovery token."));
  });
  db.close();
  return row?.token ?? null;
}

export async function getCaseByReferenceLocal(reference: string): Promise<CaseRecord | null> {
  await migrateLegacyApplications();
  return getCaseByReferenceRaw(reference);
}

export async function listCasesLocal(email?: string): Promise<CaseSummary[]> {
  await migrateLegacyApplications();
  const db = await openDb();
  const rows = await new Promise<CaseRecord[]>((resolve, reject) => {
    const store = db.transaction(CASE_STORE, "readonly").objectStore(CASE_STORE);
    if (email) {
      const request = store.index("ownerEmail").getAll(email.trim().toLowerCase());
      request.onsuccess = () => resolve((request.result as CaseRecord[]) ?? []);
      request.onerror = () => reject(request.error ?? new Error("Could not list cases."));
      return;
    }
    const request = store.getAll();
    request.onsuccess = () => resolve((request.result as CaseRecord[]) ?? []);
    request.onerror = () => reject(request.error ?? new Error("Could not list cases."));
  });
  db.close();
  return rows
    .filter((row) => !row.archivedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(toSummary);
}

export async function putAttachmentBlob(blob: AttachmentBlob): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(BLOB_STORE, "readwrite");
  tx.objectStore(BLOB_STORE).put(blob);
  await txDone(tx);
  db.close();
}

export async function getAttachmentBlob(id: string): Promise<AttachmentBlob | null> {
  const db = await openDb();
  const record = await new Promise<AttachmentBlob | null>((resolve, reject) => {
    const request = db.transaction(BLOB_STORE, "readonly").objectStore(BLOB_STORE).get(id);
    request.onsuccess = () => resolve((request.result as AttachmentBlob | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Could not read the attachment."));
  });
  db.close();
  return record;
}

export async function deleteCaseLocal(id: string): Promise<void> {
  const db = await openDb();
  const record = await getCaseLocal(id);
  const tx = db.transaction([CASE_STORE, BLOB_STORE], "readwrite");
  tx.objectStore(CASE_STORE).delete(id);
  if (record) {
    for (const attachment of record.attachments) {
      tx.objectStore(BLOB_STORE).delete(attachment.id);
    }
  }
  await txDone(tx);
  db.close();
}

async function migrateLegacyApplications(): Promise<void> {
  const db = await openDb();
  const migrated = await new Promise<boolean>((resolve, reject) => {
    const request = db.transaction(META_STORE, "readonly").objectStore(META_STORE).get(MIGRATION_KEY);
    request.onsuccess = () => resolve(Boolean(request.result));
    request.onerror = () => reject(request.error ?? new Error("Could not read migration state."));
  });
  if (migrated) {
    db.close();
    return;
  }
  const old = await new Promise<StoredApplication[]>((resolve, reject) => {
    if (!db.objectStoreNames.contains(OLD_STORE)) {
      resolve([]);
      return;
    }
    const request = db.transaction(OLD_STORE, "readonly").objectStore(OLD_STORE).getAll();
    request.onsuccess = () => resolve((request.result as StoredApplication[]) ?? []);
    request.onerror = () => reject(request.error ?? new Error("Could not read saved applications."));
  });
  db.close();
  for (const application of old) {
    const existing = await getCaseByReferenceRaw(application.acknowledgementNumber);
    if (existing) continue;
    const record = await caseFromLegacyApplication(application);
    await saveCaseLocal(record);
  }
  const next = await openDb();
  const tx = next.transaction(META_STORE, "readwrite");
  tx.objectStore(META_STORE).put({ key: MIGRATION_KEY, at: new Date().toISOString(), count: old.length });
  await txDone(tx);
  next.close();
}

async function caseFromLegacyApplication(application: StoredApplication): Promise<CaseRecord> {
  const now = application.createdAt;
  const ownerEmail = application.applicant.email.trim().toLowerCase();
  const caseId = newId();
  const applicationPdf = attachmentFromBase64({
    caseId,
    kind: "APPLICATION_PDF",
    name: "praja-rti-application.pdf",
    base64: application.applicationPdfBase64,
    mimeType: "application/pdf",
  });
  const receiptPdf = attachmentFromBase64({
    caseId,
    kind: "RECEIPT_PDF",
    name: "praja-rti-acknowledgement.pdf",
    base64: application.receiptPdfBase64,
    mimeType: "application/pdf",
  });
  if (applicationPdf.blob) await putAttachmentBlob(applicationPdf.blob);
  if (receiptPdf.blob) await putAttachmentBlob(receiptPdf.blob);
  const event: CaseEvent = {
    id: newId(),
    caseId,
    officialReferenceId: null,
    eventType: "PACKET_GENERATED",
    source: "PRAJA",
    occurredAt: now,
    recordedAt: now,
    payload: { migrated: true },
    createdBy: ownerEmail,
    idempotencyKey: `migrate:${application.acknowledgementNumber}`,
  };
  return {
    id: caseId,
    ownerEmail,
    prajaReference: application.acknowledgementNumber,
    accessTokenHash: await hashAccessToken(application.acknowledgementNumber),
    caseType: "RTI_REQUEST",
    parentCaseId: null,
    targetOfficialReferenceId: null,
    jurisdiction:
      application.report.jurisdiction === "state"
        ? "STATE"
        : application.report.jurisdiction === "central"
          ? "CENTRAL"
          : "UNCLEAR",
    authorityCode: null,
    authorityName: application.report.authority.name,
    authorityLevel: application.report.jurisdiction === "state" ? "state" : "central",
    filingChannel: application.report.filing_channel,
    preparationStatus: "PACKET_GENERATED",
    filingStatus: "NOT_FILED",
    outcomeStatus: "NONE",
    title: application.report.title,
    language: "en-IN",
    draftVersion: 1,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    applicant: { ...application.applicant, ownerEmail },
    draft: {
      id: newId(),
      caseId,
      version: 1,
      payload: {
        kind: "RTI_REQUEST",
        transcript: application.report.transcript,
        notes: application.report.notes
          ? {
              records_sought: application.report.notes.records_sought,
              date_range: application.report.notes.date_range,
              place: application.report.notes.place,
              body_hint: application.report.notes.body_hint,
              format: application.report.notes.format as "certified copies",
              missing_essentials: [],
              is_state_matter: application.report.jurisdiction === "state",
              state_name: null,
              jurisdiction: application.report.jurisdiction,
              filing_channel: application.report.filing_channel,
              jurisdiction_reasons: [],
            }
          : null,
        draft: {
          title: application.report.title,
          background: application.report.background,
          requests: application.report.requests,
        },
        report: application.report,
        portalText: "",
        coveringStatement: null,
        usesSupportingTextPdf: false,
        lifeOrLiberty: false,
        thirdParty: false,
        authorityCode: null,
      },
      portalText: "",
      characterCount: 0,
      createdAt: now,
      confirmedAt: now,
    },
    officialReferences: [],
    events: [event],
    attachments: [applicationPdf.meta, receiptPdf.meta].filter(Boolean) as AttachmentRecord[],
    deadlines: [],
    packet: {
      generatedAt: now,
      documentIds: [applicationPdf.meta.id, receiptPdf.meta.id],
      zipAttachmentId: null,
      ruleVersion: "migrated",
    },
    remindersEnabled: true,
    reminderPreferences: { inApp: true, email: false, sms: false },
    photoEvidence: [],
    mockPayment: emptyMockPayment(),
    legacyAcknowledgementNumber: application.acknowledgementNumber,
    ruleDestination: application.report.jurisdiction === "central" ? "rti-online-central" : "guidance",
  };
}

function attachmentFromBase64(input: {
  caseId: string;
  kind: AttachmentKind;
  name: string;
  base64: string;
  mimeType: string;
}): { meta: AttachmentRecord; blob: AttachmentBlob | null } {
  const id = newId();
  let bytes: ArrayBuffer | null = null;
  try {
    const binary = atob(input.base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) array[i] = binary.charCodeAt(i);
    bytes = array.buffer;
  } catch {
    bytes = null;
  }
  const meta: AttachmentRecord = {
    id,
    caseId: input.caseId,
    eventId: null,
    kind: input.kind,
    originalName: input.name,
    storedName: input.name,
    mimeType: input.mimeType,
    byteSize: bytes?.byteLength ?? 0,
    sha256: "",
    storageKey: id,
    pageCount: null,
    language: null,
    verificationStatus: "VALID",
    createdAt: new Date().toISOString(),
    deletedAt: null,
  };
  return {
    meta,
    blob: bytes ? { id, caseId: input.caseId, mimeType: input.mimeType, bytes } : null,
  };
}

export async function addEventLocal(caseId: string, event: CaseEvent): Promise<CaseRecord | null> {
  const record = await getCaseLocal(caseId);
  if (!record) return null;
  if (event.idempotencyKey && record.events.some((item) => item.idempotencyKey === event.idempotencyKey)) {
    return record;
  }
  record.events = [...record.events, event];
  record.updatedAt = event.recordedAt;
  await saveCaseLocal(record);
  return record;
}

export async function addOfficialReferenceLocal(caseId: string, reference: OfficialReference): Promise<CaseRecord | null> {
  const record = await getCaseLocal(caseId);
  if (!record) return null;
  record.officialReferences = [...record.officialReferences, reference];
  record.updatedAt = reference.createdAt;
  await saveCaseLocal(record);
  return record;
}

export function jsonOk(res: Response): boolean {
  return (res.headers.get("content-type") ?? "").includes("application/json");
}

function bytesToBase64(bytes: ArrayBuffer): string {
  const array = new Uint8Array(bytes);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < array.length; i += chunk) {
    binary += String.fromCharCode(...array.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function uploadAttachmentToServer(record: CaseRecord, attachmentId: string): Promise<boolean> {
  const blob = await getAttachmentBlob(attachmentId);
  const meta = record.attachments.find((item) => item.id === attachmentId);
  if (!blob || !meta) return false;
  try {
    const res = await fetch(`/api/cases/${encodeURIComponent(record.id)}/attachments/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        originalName: meta.originalName,
        mimeType: meta.mimeType,
        kind: meta.kind,
        base64: bytesToBase64(blob.bytes),
        clientId: meta.id,
      }),
    });
    return res.ok || res.status === 409;
  } catch {
    return false;
  }
}

async function syncAttachments(record: CaseRecord): Promise<void> {
  for (const attachment of record.attachments.filter((item) => !item.deletedAt)) {
    await uploadAttachmentToServer(record, attachment.id);
  }
}

export async function saveCase(record: CaseRecord): Promise<"server-and-device" | "device-only"> {
  const previous = await getCaseLocal(record.id);
  await saveCaseLocal(record);
  try {
    const res = await fetch("/api/cases", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(previous ? { "If-Match": previous.updatedAt } : {}),
      },
      credentials: "same-origin",
      body: JSON.stringify({ ...record, accessToken: record.accessToken ?? (await getAccessToken(record.id)) ?? undefined }),
    });
    if (res.ok && jsonOk(res)) {
      const payload = (await res.json()) as { accessToken?: string; case?: CaseRecord };
      if (payload.accessToken) await rememberAccessToken(record.id, payload.accessToken, record.prajaReference);
      if (record.accessToken) await rememberAccessToken(record.id, record.accessToken, record.prajaReference);
      await syncAttachments(record);
      return "server-and-device";
    }
  } catch {
    // IndexedDB remains the working copy.
  }
  return "device-only";
}

export async function fetchCase(id: string): Promise<CaseRecord | null> {
  try {
    const res = await fetch(`/api/cases/${encodeURIComponent(id)}`, { cache: "no-store", credentials: "same-origin" });
    if (res.ok && jsonOk(res)) {
      const payload = (await res.json()) as { case?: CaseRecord };
      if (payload.case) {
        await saveCaseLocal(payload.case);
        return hydrateCase(payload.case);
      }
    }
  } catch {
    // Fall through.
  }
  return getCaseLocal(id);
}

export async function deleteCase(id: string, purge = false): Promise<void> {
  try {
    await fetch(`/api/cases/${encodeURIComponent(id)}${purge ? "?purge=1" : ""}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
  } catch {
    // Local delete still proceeds.
  }
  await deleteCaseLocal(id);
}

export async function downloadAttachmentBytes(caseId: string, attachmentId: string): Promise<AttachmentBlob | null> {
  const local = await getAttachmentBlob(attachmentId);
  if (local) return local;
  try {
    const res = await fetch(`/api/cases/${encodeURIComponent(caseId)}/attachments/${encodeURIComponent(attachmentId)}`, {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!res.ok) return null;
    const bytes = await res.arrayBuffer();
    const mimeType = res.headers.get("content-type") || "application/octet-stream";
    const blob: AttachmentBlob = { id: attachmentId, caseId, mimeType, bytes };
    await putAttachmentBlob(blob);
    return blob;
  } catch {
    return null;
  }
}

export async function fetchCaseByReference(reference: string, token?: string): Promise<CaseRecord | null> {
  const local = await getCaseByReferenceLocal(reference);
  const recovery = token ?? (await getAccessTokenByReference(reference)) ?? (local ? await getAccessToken(local.id) : null);
  if (recovery) {
    try {
      const res = await fetch(
        `/api/cases?ref=${encodeURIComponent(reference.trim().toUpperCase())}&token=${encodeURIComponent(recovery)}`,
        { cache: "no-store", credentials: "same-origin" },
      );
      if (res.ok && jsonOk(res)) {
        const payload = (await res.json()) as { case?: CaseRecord };
        if (payload.case) {
          await saveCaseLocal(payload.case);
          await rememberAccessToken(payload.case.id, recovery, payload.case.prajaReference);
          return hydrateCase(payload.case);
        }
      }
    } catch {
      // Fall through to the device copy.
    }
  }
  return local;
}

export async function copyAttachments(
  from: CaseRecord,
  to: CaseRecord,
  kinds: AttachmentRecord["kind"][],
): Promise<CaseRecord> {
  const next = { ...to, attachments: [...to.attachments] };
  for (const attachment of from.attachments.filter((item) => !item.deletedAt && kinds.includes(item.kind))) {
    const blob = await getAttachmentBlob(attachment.id);
    const copy: AttachmentRecord = {
      ...attachment,
      id: newId(),
      caseId: to.id,
      createdAt: new Date().toISOString(),
    };
    if (blob) {
      await putAttachmentBlob({ id: copy.id, caseId: to.id, mimeType: blob.mimeType, bytes: blob.bytes });
    }
    next.attachments.push(copy);
  }
  return next;
}

export async function fetchCaseList(email?: string): Promise<CaseSummary[]> {
  try {
    const res = await fetch("/api/cases", { cache: "no-store" });
    if (res.ok && jsonOk(res)) {
      const payload = (await res.json()) as { cases?: CaseSummary[] };
      if (payload.cases) return payload.cases;
    }
  } catch {
    // Fall through.
  }
  return listCasesLocal(email);
}

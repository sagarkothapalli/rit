import type { CaseType } from "@/lib/domain/status";

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function randomToken(length = 9): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let token = "";
  for (const byte of bytes) token += ALPHABET[byte % ALPHABET.length];
  return token;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function isCaseId(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export function assertCaseId(value: string): string {
  const id = value.trim().toLowerCase();
  if (!UUID_RE.test(id)) {
    throw new Error("INVALID_CASE_ID");
  }
  return id;
}

/** Random workspace recovery token. Never derived from the Praja reference. */
export function makeAccessToken(): string {
  return randomToken(24);
}

export function makePrajaReference(caseType: CaseType, date = new Date()): string {
  const year = String(date.getFullYear()).slice(-2);
  const prefix =
    caseType === "FIRST_APPEAL"
      ? "FA1"
      : caseType === "SECOND_APPEAL"
        ? "FA2"
        : caseType === "SECTION_18_COMPLAINT"
          ? "C18"
          : "ACK";
  return `PRTI/${prefix}/${year}/${randomToken()}`;
}

export async function sha256Hex(bytes: Uint8Array | ArrayBuffer): Promise<string> {
  const data: ArrayBuffer = bytes instanceof Uint8Array
    ? (bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer)
    : bytes;
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashAccessToken(token: string): Promise<string> {
  const encoded = new TextEncoder().encode(token.trim().toUpperCase());
  return sha256Hex(encoded);
}

export function hashesEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i += 1) {
    mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return mismatch === 0;
}

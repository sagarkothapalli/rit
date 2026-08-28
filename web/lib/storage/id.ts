import type { CaseType } from "@/lib/domain/status";

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

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
